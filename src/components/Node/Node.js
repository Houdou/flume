import React from "react";
import styles from "./Node.css";
import { NodeTypesContext } from '../../context'
import IoPorts from '../IoPorts/IoPorts'

const Node = ({ id, width, height, x, y, delay = 6, stageRef, type, onDragEnd, onDrag }) => {
  const nodeTypes = React.useContext(NodeTypesContext)
  const {label, inputs = [], outputs = []} = nodeTypes[type]

  const startCoordinates = React.useRef(null)
  const [coordinates, setCoordinates] = React.useState({x,y})
  const [isDragging, setIsDragging] = React.useState(false)
  const offset = React.useRef()
  const nodeWrapper = React.useRef()


  const updateCoordinates = e => {
    setCoordinates({
      x: e.clientX - stageRef.current.left - offset.current.x,
      y: e.clientY - stageRef.current.top - offset.current.y
    })
    onDrag(e)
  }

  const stopDrag = e => {
    setIsDragging(false)
    window.removeEventListener("mouseup", stopDrag)
    window.removeEventListener("mousemove", updateCoordinates)
    onDragEnd()
  }

  const startDrag = e => {
    const nodeRect = nodeWrapper.current.getBoundingClientRect();
    offset.current = {x: startCoordinates.current.x - nodeRect.left, y: startCoordinates.current.y - nodeRect.top}
    updateCoordinates(e)
    setIsDragging(true)
    window.addEventListener("mouseup", stopDrag)
    window.addEventListener("mousemove", updateCoordinates)
  }

  const checkDragDelay = e => {
    let x;
    let y;
    if ("ontouchstart" in window && e.touches) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      e.preventDefault();
      x = e.clientX;
      y = e.clientY;
    }
    let a = Math.abs(startCoordinates.current.x - x);
    let b = Math.abs(startCoordinates.current.y - y);
    let distance = Math.round(Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2)));
    let dragDistance = delay;
    if (distance >= dragDistance) {
      startDrag(e);
      endDragDelay();
    }
  };

  const endDragDelay = () => {
    document.removeEventListener("mouseup", endDragDelay);
    document.removeEventListener("mousemove", checkDragDelay);
    startCoordinates.current = null;
  };

  const startDragDelay = e => {
    let x;
    let y;
    if ("ontouchstart" in window && e.touches) {
      x = e.touches[0].clientX;
      y = e.touches[0].clientY;
    } else {
      e.preventDefault();
      x = e.clientX;
      y = e.clientY;
    }
    startCoordinates.current = { x, y }
    document.addEventListener("mouseup", endDragDelay);
    document.addEventListener("mousemove", checkDragDelay);
  };

  return (
    <div
      className={styles.wrapper}
      style={{
        width,
        // height,
        left: coordinates.x,
        top: coordinates.y
      }}
      onMouseDown={startDragDelay}
      onTouchStart={startDragDelay}
      ref={nodeWrapper}
      data-node-id={id}
    >
      <h2 className={styles.label}>{label}</h2>
      <IoPorts inputs={inputs} outputs={outputs} />
    </div>
  );
};

export default Node;
