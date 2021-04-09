import { JoinRoomAndGetInfoResponse } from "@dogehouse/kebab";
import { useRouter } from "next/router";
import { useEffect } from "react";
import { useCurrentRoomIdStore } from "../../global-stores/useCurrentRoomIdStore";
import { isServer } from "../../lib/isServer";
import { validate as uuidValidate } from "uuid";
import { showErrorToast } from "../../lib/showErrorToast";
import { useTypeSafeQuery } from "../../shared-hooks/useTypeSafeQuery";
import isElectron from "is-electron";
import { useRoomChatStore } from "./chat/useRoomChatStore";

let ipcRenderer: any = null;
if (isElectron()) {
  ipcRenderer = window.require("electron").ipcRenderer;
}
export const useGetRoomByQueryParam = () => {
  const { currentRoomId, setCurrentRoomId } = useCurrentRoomIdStore();
  const { query } = useRouter();
  const roomId = typeof query.id === "string" ? query.id : "";
  const reset = useRoomChatStore((s) => s.reset);
  const { data, isLoading } = useTypeSafeQuery(
    ["joinRoomAndGetInfo", roomId || ""],
    {
      enabled: uuidValidate(roomId) && !isServer,
      refetchOnMount: "always",
      onSuccess: ((d: JoinRoomAndGetInfoResponse | { error: string }) => {
        if (d && !("error" in d) && d.room) {
          if (isElectron()) {
            ipcRenderer.send("@voice/active", true);
          }
          if (currentRoomId !== d.room.id) {
            reset();
          }
          setCurrentRoomId(() => d.room.id);
        }
      }) as any,
    },
    [roomId]
  );
  const { push } = useRouter();

  useEffect(() => {
    if (roomId) {
      setCurrentRoomId(roomId);
      if (isElectron()) {
        ipcRenderer.send("@voice/active", true);
      }
    }
  }, [roomId, setCurrentRoomId]);

  const errMsg = data && "error" in data ? data.error : "";
  const noData = !data;

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (noData) {
      setCurrentRoomId(null);
      if (isElectron()) {
        ipcRenderer.send("@voice/active", false);
      }
      push("/dash");
      return;
    }
    if (errMsg) {
      setCurrentRoomId(null);
      if (isElectron()) {
        ipcRenderer.send("@voice/active", false);
      }
      console.log(errMsg, isLoading);
      showErrorToast(errMsg);
      push("/dash");
    }
  }, [noData, errMsg, isLoading, push, setCurrentRoomId]);

  return { data, isLoading };
};
