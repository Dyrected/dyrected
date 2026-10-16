import { useContext, useEffect, useState } from "react";
import {
  ViewControllerContext,
  type ViewDataHandlers,
  type ViewDataSlice,
} from "../providers/view-controller";

/**
 * Publishes the documents a layout loaded to the view controller, so slot
 * components and `useCollectionView()` see what the layout shows.
 *
 * Memoize `slice` and `handlers`: the controller notifies subscribers when
 * their identity changes. Outside an operational view this is a no-op.
 */
export function usePublishViewData(slice: ViewDataSlice, handlers?: ViewDataHandlers): void {
  const controller = useContext(ViewControllerContext);
  const [owner] = useState(() => Symbol("view-data-owner"));

  useEffect(() => {
    controller?.setData(owner, slice, handlers);
  }, [controller, owner, slice, handlers]);

  useEffect(() => {
    return () => controller?.clearData(owner);
  }, [controller, owner]);
}
