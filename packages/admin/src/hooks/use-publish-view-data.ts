import { useContext, useLayoutEffect, useRef } from "react";
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
  const ownerRef = useRef<symbol | null>(null);
  if (!ownerRef.current) ownerRef.current = Symbol("view-data-owner");

  useLayoutEffect(() => {
    controller?.setData(ownerRef.current!, slice, handlers);
  }, [controller, slice, handlers]);

  useLayoutEffect(() => {
    const owner = ownerRef.current!;
    return () => controller?.clearData(owner);
  }, [controller]);
}
