// import { KoxyNode } from ".";
// import { Koxy as KoxyClass } from "./koxy";

// export const myNodes: KoxyNode[] = [
//   {
//     id: "node1",
//     name: "node1",
//     type: "normal",
//     label: "node1",
//     icon: "node1",
//     description: "node1",
//     code: "node1",
//     inputs: [],
//     next: "node2",
//     onFail: {
//       type: "retry",
//       max: 3,
//       interval: 1000,
//       continue: true,
//     },
//   },
//   {
//     id: "node2",
//     name: "node2",
//     type: "condition",
//     label: "node2",
//     icon: "node2",
//     description: "node2",
//     code: "node2",
//     inputs: [],
//     next: {
//       success: "end",
//       fail: KoxyClass.stopSign,
//     },
//   },
//   {
//     type: "return",
//     id: "end",
//     name: "end",
//     label: "end",
//     icon: "end",
//     description: "end",
//     code: "end",
//     inputs: [],
//   },
// ];

// const testnodes = {
//   "node1": [
//     myNodes[0],
//     {
//       main: (async () => {
//         return true;
//       }),
//     },
//   ],
//   "node2": [
//     myNodes[1],
//     {
//       main: async (node: KoxyNode, koxy: KoxyClass, self) => {
//         return koxy.results.get("node1");
//       },
//     },
//   ],
//   "end": [
//     myNodes[2],
//     {
//       main: async () => {
//         return { status: 200, message: "Hi!" };
//       },
//     },
//   ],
// };

// export const testkoxy = new KoxyClass(
//   {
//     flows: {
//       "/api/hi": [
//         {
//           id: "1",
//           name: "1",
//           method: "GET",
//           history: [],
//           "dependecies": [],
//           start: {
//             type: "start",
//             id: "start",
//             name: "start",
//             label: "start",
//             icon: "start",
//             description: "start",
//             code: "start",
//             inputs: [],
//             next: "node1",
//           },
//           end: {
//             type: "return",
//             id: "end",
//             name: "end",
//             label: "end",
//             icon: "end",
//             description: "end",
//             code: "end",
//             inputs: [],
//           },
//           nodes: myNodes,
//         },
//       ],
//     },
//   },
//   {} as any,
//   {},
//   true,
// );

// (async () => {
//   console.time("run");
//   const res = await testkoxy.run("/api/hi/", "GET");
//   console.timeEnd("run");

//   console.log(res);
//   console.log(testkoxy.results);
// })();
