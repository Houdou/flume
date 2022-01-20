import React from "react";
import styles from "./Stage.css";
import { Portal } from "react-portal";
import ContextMenu from "../ContextMenu/ContextMenu";
import { NodeTypesContext, NodeDispatchContext } from "../../context";
import Draggable from "../Draggable/Draggable";
import orderBy from "lodash/orderBy";
import clamp from "lodash/clamp";
import { STAGE_ID } from '../../constants'

const Stage = ({
  scale,
  translate,
  editorId,
  dispatchStageState,
  children,
  outerStageChildren,
  numNodes,
  stageRef,
  spaceToPan,
  dispatchComments,
  disableComments,
  disablePan,
  disableZoom
}) => {
  const nodeTypes = React.useContext(NodeTypesContext);
  const dispatchNodes = React.useContext(NodeDispatchContext);
  const wrapper = React.useRef();
  const translateWrapper = React.useRef();
  const selectionArea = React.useRef();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [selecting, setSelecting] = React.useState(false);
  const [menuCoordinates, setMenuCoordinates] = React.useState({ x: 0, y: 0 });
  const dragData = React.useRef({ x: 0, y: 0 });
  const selectData = React.useRef({ x: 0, y: 0, w: 0, h: 0 });
  const [spaceIsPressed, setSpaceIsPressed] = React.useState(false);

  const setStageRect = React.useCallback(() => {
    stageRef.current = wrapper.current.getBoundingClientRect();
  }, []);

  React.useEffect(() => {
    stageRef.current = wrapper.current.getBoundingClientRect();
    window.addEventListener("resize", setStageRect);
    return () => {
      window.removeEventListener("resize", setStageRect);
    };
  }, [stageRef, setStageRect]);

  const handleWheel = React.useCallback(
    e => {
      if (e.target.nodeName === "TEXTAREA" || e.target.dataset.comment) {
        if (e.target.clientHeight < e.target.scrollHeight) return;
      }
      e.preventDefault();
      if (numNodes > 0) {
        const delta = e.deltaY;
        dispatchStageState(({ scale }) => ({
          type: "SET_SCALE",
          scale: clamp(scale - clamp(delta, -10, 10) * 0.005, 0.1, 7)
        }));
      }
    },
    [dispatchStageState, numNodes]
  );

  const handleDragDelayStart = e => {
    wrapper.current.focus();
  };

  const handleDragStart = e => {
    e.preventDefault();
    const pan = e.buttons === 4 || e.altKey;
    dragData.current = {
      pan,
      x: e.clientX,
      y: e.clientY
    };
    selectData.current = {
      x: e.clientX,
      y: e.clientY,
      w: 0,
      h: 0,
    }
    if(!pan) {
      // Selection area window
      setSelecting(true);
    }
  };

  const handleMouseDrag = (coords, e) => {
    if(dragData.current.pan) {
      const xDistance = dragData.current.x - e.clientX;
      const yDistance = dragData.current.y - e.clientY;
      translateWrapper.current.style.transform = `translate(${-(
        translate.x + xDistance
      )}px, ${-(translate.y + yDistance)}px)`;
    } else {
      const prev = {...selectData.current};
      const dx = e.clientX - dragData.current.x;
      const dy = e.clientY - dragData.current.y;
      // Update selection area size
      selectData.current = {
        x: prev.x,
        y: prev.y,
        w: dx,
        h: dy,
      };

      const area = {
        x: Math.min(prev.x, prev.x + dx),
        y: Math.min(prev.y, prev.y + dy),
        w: Math.abs(dx),
        h: Math.abs(dy),
      };
      selectionArea.current.style.left = `${area.x}px`;
      selectionArea.current.style.top = `${area.y}px`;
      selectionArea.current.style.width = `${area.w}px`;
      selectionArea.current.style.height = `${area.h}px`;
    }
  };

  const handleDragEnd = e => {
    const xDistance = dragData.current.x - e.clientX;
    const yDistance = dragData.current.y - e.clientY;
    dragData.current.x = e.clientX;
    dragData.current.y = e.clientY;
    if(dragData.current.pan) {
      dispatchStageState(({ translate: tran }) => ({
        type: "SET_TRANSLATE",
        translate: {
          x: tran.x + xDistance,
          y: tran.y + yDistance
        }
      }));
    } else {
      // Trigger selection
      setSelecting(false);
    }
  };

  const handleContextMenu = e => {
    e.preventDefault();
    setMenuCoordinates({ x: e.clientX, y: e.clientY });
    setMenuOpen(true);
    return false;
  };

  const closeContextMenu = () => {
    setMenuOpen(false);
  };

  const byScale = value => (1 / scale) * value;

  const addNode = ({ node, internalType }) => {
    const wrapperRect = wrapper.current.getBoundingClientRect();
    const x =
      byScale(menuCoordinates.x - wrapperRect.x - wrapperRect.width / 2) +
      byScale(translate.x);
    const y =
      byScale(menuCoordinates.y - wrapperRect.y - wrapperRect.height / 2) +
      byScale(translate.y);
    if (internalType === "comment") {
      dispatchComments({
        type: "ADD_COMMENT",
        x,
        y
      });
    } else {
      dispatchNodes({
        type: "ADD_NODE",
        x,
        y,
        nodeType: node.type
      });
    }
  };

  const handleDocumentKeyUp = e => {
    if (e.which === 32) {
      setSpaceIsPressed(false);
      document.removeEventListener("keyup", handleDocumentKeyUp);
    }
  };

  const handleKeyDown = e => {
    if (e.which === 32 && document.activeElement === wrapper.current) {
      e.preventDefault();
      e.stopPropagation();
      setSpaceIsPressed(true);
      document.addEventListener("keyup", handleDocumentKeyUp);
    }
  };

  const handleMouseEnter = () => {
    if (!wrapper.current.contains(document.activeElement)) {
      wrapper.current.focus();
    }
  };

  React.useEffect(() => {
    if(!disableZoom){
      let stageWrapper = wrapper.current;
      stageWrapper.addEventListener("wheel", handleWheel);
      return () => {
        stageWrapper.removeEventListener("wheel", handleWheel);
      };
    }
  }, [handleWheel, disableZoom]);

  const menuOptions = React.useMemo(
    () => {
      const options = orderBy(
        Object.values(nodeTypes)
          .filter(node => node.addable !== false)
          .map(node => ({
            value: node.type,
            label: node.label,
            description: node.description,
            sortIndex: node.sortIndex,
            node
          })),
        ["sortIndex", "label"]
      )
      if(!disableComments){
        options.push({ value: "comment", label: "Comment", description: "A comment for documenting nodes", internalType: "comment" })
      }
      return options
    },
    [nodeTypes, disableComments]
  );

  return (
    <Draggable
      id={`${STAGE_ID}${editorId}`}
      className={styles.wrapper}
      innerRef={wrapper}
      onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter}
      onDragDelayStart={handleDragDelayStart}
      onDragStart={handleDragStart}
      onDrag={handleMouseDrag}
      onDragEnd={handleDragEnd}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
      stageState={{ scale, translate }}
      style={{ cursor: spaceIsPressed && spaceToPan ? "grab" : "" }}
      disabled={disablePan || (spaceToPan && !spaceIsPressed)}
      data-flume-stage={true}
    >
      {menuOpen ? (
        <Portal>
          <ContextMenu
            x={menuCoordinates.x}
            y={menuCoordinates.y}
            options={menuOptions}
            onRequestClose={closeContextMenu}
            onOptionSelected={addNode}
            label="Add Node"
          />
        </Portal>
      ) : null}
      {selecting ? (
        <Portal>
          <div
            ref={selectionArea}
            style={{
              width: 0,
              height: 0,
              left: 0,
              top: 0,
              position: 'absolute',
              border: '2px cyan solid'
            }}
          />
        </Portal>
      ) : null}
      <div
        ref={translateWrapper}
        className={styles.transformWrapper}
        style={{ transform: `translate(${-translate.x}px, ${-translate.y}px)` }}
      >
        <div
          className={styles.scaleWrapper}
          style={{ transform: `scale(${scale})` }}
        >
          {children}
        </div>
      </div>
      {outerStageChildren}
    </Draggable>
  );
};
export default Stage;
