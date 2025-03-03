// import React, { useState, useEffect } from 'react';
// import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
// import { io } from 'socket.io-client';

// const socket = io('http://localhost:8080');

// function App() {
//   const [tasks, setTasks] = useState([
//     { id: '1', title: 'Task 1' },
//     { id: '2', title: 'Task 2' },
//   ]);

//   useEffect(() => {
//     socket.on('tasks', (data) => {
//       setTasks(data);
//     });

//     return () => {
//       socket.off('tasks');
//     };
//   }, []);

//   const handleDragEnd = (result) => {
//     if (!result.destination) return;
//     const items = Array.from(tasks);
//     const [reorderedItem] = items.splice(result.source.index, 1);
//     items.splice(result.destination.index, 0, reorderedItem);
//     setTasks(items);
//     socket.emit('updateTasks', items);
//   };

//   return (
//     <div>
//       <h1>Task App</h1>
//       <DragDropContext onDragEnd={handleDragEnd}>
//         <Droppable droppableId="tasks">
//           {(provided) => (
//             <ul {...provided.droppableProps} ref={provided.innerRef}>
//               {tasks.map((task, index) => (
//                 <Draggable key={task.id} draggableId={task.id} index={index}>
//                   {(provided) => (
//                     <li
//                       ref={provided.innerRef}
//                       {...provided.draggableProps}
//                       {...provided.dragHandleProps}
//                     >
//                       {task.title}
//                     </li>
//                   )}
//                 </Draggable>
//               ))}
//               {provided.placeholder}
//             </ul>
//           )}
//         </Droppable>
//       </DragDropContext>
//     </div>
//   );
// }

// export default App;