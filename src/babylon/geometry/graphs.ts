import { Vector2 } from '@babylonjs/core';
import { GrowthEdge } from './differentialGrowth';
import { HalfEdge, VolumetricCell, VolumetricVertex } from './volumetricMesh';

// graph department
type Edge = { v0: string; v1: string; faceKey?: string; undirectedEdgeKey?: string };
type UndirectedEdgeMap = { [undirectedEdgeID: string]: Edge[] };
type EdgeChain = { isLoop: boolean; edges: string[]; nodes: string[] };
type HalfEdgeMap = {[edgeId: string] : HalfEdge};
type VolumetricVertexMap = {[vertexId: string]: VolumetricVertex};
type VectorMap = {[vertexId: string]: Vector2};
type EdgeMap = {[edgeId: string] : Edge};

export const isSingleChain = (chains: EdgeChain[], items?: number) => {
    return chains.length === 1 && (items ? chains[0].edges.length === items : true);
}

const geometricName = (v : Vector2) => `${v.x.toFixed(6)}-${v.y.toFixed(6)}`

const mapV = (v: Vector2, simpleVectorMap: VectorMap, vectorNameMap: {[id: string] : string}, vCount: number) => {
  let vName: string;
  const geoName = geometricName(v);
  if(geoName in simpleVectorMap) {
    vName = vectorNameMap[geoName];
  } else {
    simpleVectorMap[geoName] = v;
    vName = `v${vCount}`;
    vectorNameMap[geoName] = vName
    vCount++;
  }

  return {vName, vCount};
}

// interface for growth objects, edges are already undirected
const growthToGraph = (growthEdges: GrowthEdge[]) => {
  const simpleVectorMap: VectorMap = {};
  const vectorNameMap: {[id: string] : string} = {};
  const edgeMap: EdgeMap = {};

  let vCount = 0;

  growthEdges.forEach((e, i) => {
    const e0 = mapV(e[0], simpleVectorMap, vectorNameMap, vCount);
    vCount = e0.vCount;
    const e1 = mapV(e[1], simpleVectorMap, vectorNameMap, vCount);
    vCount = e1.vCount;
    const edgeName = `e${i}`;
    edgeMap[edgeName] = {v0: e0.vName, v1: e1.vName};
  })

  return {edgeMap};
}

// interface for graph objects
const cellToGraph = (cell: VolumetricCell) => {
    const halfEdgeMap: HalfEdgeMap = {};
    const vertexMap: VolumetricVertexMap = {};
    const edgeMap: EdgeMap = {};

    cell.faces.forEach((face, i) => halfEdgesToGraphBase(face.getEdges(), face.name ?? `f${i}`, halfEdgeMap, vertexMap, edgeMap));
    const undirectedEdgesMap = constructUndirectedGraphMap(edgeMap);

    return {halfEdgeMap, vertexMap, edgeMap, undirectedEdgesMap}
};

export const hEdgesToGraph = (edges: HalfEdge[]) => {
    const { halfEdgeMap, vertexMap, edgeMap} = halfEdgesToGraphBase(edges);
    const undirectedEdgesMap = constructUndirectedGraphMap(edgeMap);

    return {halfEdgeMap, vertexMap, edgeMap, undirectedEdgesMap};
}

const growthEdgesToGraphBase = (growthEdges: GrowthEdge[]) => {

}

// interface for halfEDge arrays
const halfEdgesToGraphBase = (hEdges: HalfEdge[], faceKey?: string, halfEdgeMap?: HalfEdgeMap, vertexMap?: VolumetricVertexMap, edgeMap?: EdgeMap) => {
    halfEdgeMap = halfEdgeMap ?? {};
    hEdges.forEach(hEdge => halfEdgeMap[hEdge.id] = hEdge);
    vertexMap = vertexMap ?? {};
    edgeMap = edgeMap ?? {};
    hEdges.forEach(he => {
        const v0 = he.getVertex();
        const v1 = he.getVertexPrevious();
        if (!(v0.id in vertexMap)) vertexMap[v0.id] = v0;
        if (!(v1.id in vertexMap)) vertexMap[v1.id] = v1;
        edgeMap[he.id] = {v0: v0.id, v1: v1.id, faceKey: faceKey};
});

  return {halfEdgeMap, vertexMap, edgeMap}
};

const constructUndirectedGraphMap = (edgeMap: EdgeMap): UndirectedEdgeMap => {
    const undirectedEdgesMap: UndirectedEdgeMap = {};

    // counting edges undirected
  const simpleUndirectedEdgeMap: { [simpleEdgeKey: string]: string } = {};

  let k = 0;

  Object.values(edgeMap).forEach((e) => {
    const unambigiousEdgeKeyName = [e.v0, e.v1].sort().toString();
    if (unambigiousEdgeKeyName in simpleUndirectedEdgeMap) undirectedEdgesMap[simpleUndirectedEdgeMap[unambigiousEdgeKeyName]].push(e);
    else {
      const undirectedEdgeKey = 'e' + k.toString();
      simpleUndirectedEdgeMap[unambigiousEdgeKeyName] = undirectedEdgeKey;
      undirectedEdgesMap[undirectedEdgeKey] = [e];
      k++;
    }
  });

  return undirectedEdgesMap;
};

/**
 * Method that parses an array of VolumetricVertex arrays into a graph
 * @param polylines array of Vertex arrays
 * @param faceChar the name whit which the parent object of the edge will be described
 * @param withoutLast whether the polylines are given are considered to be closed (polygons / faces) or not
 * @returns edge array, undirected edge map, geometry map (VolumetricVertex corresponding to the node ids), mappedFaces: polylines where the VolumetricVertex is replaced with the node ID of the graph
 */
const vectorSeriesToGraph = (polylines: VolumetricVertex[][], faceChar: string = 'f', withoutLast: boolean = false) => {
  // constructing ids for all vertices
  const simpleMap: { [geometricName: string]: string } = {};
  const geometricVertexMap: { [simpleID: string]: VolumetricVertex } = {};
  let i = 0;

  const mappedFaces = polylines.map((face) =>
    face.map((v) => {
      const geometricName = v.id;
      if (geometricName in simpleMap) return simpleMap[geometricName];
      else {
        const simpleID = 'v' + i.toString();
        simpleMap[geometricName] = simpleID;
        geometricVertexMap[simpleID] = v;
        i++;
        return simpleID;
      }
    })
  );

  const allEdges: Edge[] = [];

  // constructing edges
  mappedFaces.forEach((face, j) => {
    const faceName = faceChar + j.toString();
    for (let idx = 0; idx < (withoutLast ? face.length - 1 : face.length); idx++) {
      const v0 = face[idx];
      const v1 = face[(idx + 1) % face.length];
      allEdges.push({ v0, v1, faceKey: faceName });
    }
  });

  // counting edges undirected
  const simpleUndirectedEdgeMap: { [simpleEdgeKey: string]: string } = {};
  const undirectedEdgesMap: UndirectedEdgeMap = {};

  let k = 0;

  allEdges.forEach((edge) => {
    const unambigiousEdgeKeyName = [edge.v0, edge.v1].sort().toString();
    if (unambigiousEdgeKeyName in simpleUndirectedEdgeMap) undirectedEdgesMap[simpleUndirectedEdgeMap[unambigiousEdgeKeyName]].push(edge);
    else {
      const undirectedEdgeKey = 'e' + k.toString();
      simpleUndirectedEdgeMap[unambigiousEdgeKeyName] = undirectedEdgeKey;
      undirectedEdgesMap[undirectedEdgeKey] = [edge];
      k++;
    }
  });

  return { allEdges, undirectedEdgesMap, geometricVertexMap, mappedFaces };
};

/**
 * function that filters undirected edges based on the map of all the edges corresponding to a given undirected edge whether it's naked (only one matching edge)
 * @param undirectEdgesMap
 * @returns
 */
const findNakedEdges = (undirectEdgesMap: UndirectedEdgeMap) => {
  const filteredUndirectEdgesMap: { [undirectedEdgeName: string]: Edge[] } = {};
  Object.keys(undirectEdgesMap).forEach((key) => {
    if (undirectEdgesMap[key].length === 1) filteredUndirectEdgesMap[key] = undirectEdgesMap[key];
  });

  return filteredUndirectEdgesMap;
};

/**
 * Function that returns a map of all the undirected edges that are connected to a given node
 * @param undirectedEdgesMap all the edges that are mapped to a given undirected edge
 * @returns
 */
const undirectEdgesByNodeMap = (undirectedEdgesMap: UndirectedEdgeMap) => {
  const nodeMap: { [nodeID: string]: string[] } = {};

  Object.entries(undirectedEdgesMap).forEach(([undirectedEdgeName, edges]) => {
    const { v0, v1 } = edges[0];
    if (v0 in nodeMap) nodeMap[v0].push(undirectedEdgeName);
    else nodeMap[v0] = [undirectedEdgeName];
    if (v1 in nodeMap) nodeMap[v1].push(undirectedEdgeName);
    else nodeMap[v1] = [undirectedEdgeName];
  });

  return nodeMap;
};

/**
 * Function that returns a map of all the the undirected edges nodes
 * @param nodeMap map of all the nodes with the connected undirected edges
 * @returns
 */
const nodesByUndirectedEdges = (nodeMap: { [nodeID: string]: string[] }) => {
  const edgeMap: { [undirectedEdgeName: string]: string[] } = {};

  Object.entries(nodeMap).forEach(([nodeID, undirectedEdgeNames]) => {
    undirectedEdgeNames.forEach((undirectedEdgeName) => {
      if (undirectedEdgeName in edgeMap) edgeMap[undirectedEdgeName].push(nodeID);
      else edgeMap[undirectedEdgeName] = [nodeID];
    });
  });

  return edgeMap;
};

/**
 * Method to construct all the chains from a set of undirected edges.
 * @param startNode node at which the iteration started
 * @param currentNode new iteration
 * @param currentUndirectedEdge current undirected edge
 * @param forwardEdgeMap edge neighbour for node map
 * @param forwardNodeMap node neighbour for edge map
 * @returns
 */
const recursiveJoin = (
  startNode: string,
  currentNode: string,
  currentUndirectedEdge: string,
  forwardEdgeMap: { [activeUndirectedEdge: string]: { [currentNode: string]: string | undefined } },
  forwardNodeMap: { [activeNode: string]: { [currentUndirectedEdge: string]: string } }
): { isLoop: boolean; edgeList: string[]; nodeList: string[] } => {
  const nextUEdge = forwardEdgeMap[currentUndirectedEdge][currentNode];
  if (nextUEdge === undefined) return { isLoop: false, edgeList: [currentUndirectedEdge], nodeList: [currentNode] }; // no more edges after this one
  const nextNode = forwardNodeMap[currentNode][nextUEdge];

  if (nextNode === startNode) return { isLoop: true, edgeList: [currentUndirectedEdge], nodeList: [currentNode] }; // loop case

  const { isLoop, edgeList, nodeList } = recursiveJoin(startNode, nextNode, nextUEdge, forwardEdgeMap, forwardNodeMap);

  return { isLoop, edgeList: [currentUndirectedEdge, ...edgeList], nodeList: [currentNode, ...nodeList] };
};

/**
 * Function that retuns all the chains of edges that share only one node with one another (dual degree)
 * @param undirectedEdgesMap
 * @returns chain[] {isLoop: booleam, edges: string (IDs), nodes: string (IDs)}
 */
export const findAllChainsOfDualDegreeNodes = (undirectedEdgesMap: UndirectedEdgeMap): EdgeChain[] => {
  const chains: EdgeChain[] = [];

  const nodeMap = undirectEdgesByNodeMap(undirectedEdgesMap);
  const degreeTwoSet = new Set<string>();
  const nodeCount = Object.keys(nodeMap).length;

  const forwardNodeMap: { [activeNode: string]: { [currentEdge: string]: string } } = {};
  const forwardEdgeMap: { [activeEdge: string]: { [currentNode: string]: string | undefined } } = {};

  const edgeSet = new Set(Object.keys(undirectedEdgesMap));

  // constructring the forwardEdgeMap
  Object.entries(nodeMap).forEach(([nodeID, undirectedEdgeNames]) => {
    if (undirectedEdgeNames.length === 2) {
      const [edge0, edge1] = undirectedEdgeNames;
      if (edge0 in forwardEdgeMap) forwardEdgeMap[edge0][nodeID] = edge1;
      else forwardEdgeMap[edge0] = { [nodeID]: edge1 };
      if (edge1 in forwardEdgeMap) forwardEdgeMap[edge1][nodeID] = edge0;
      else forwardEdgeMap[edge1] = { [nodeID]: edge0 };
      degreeTwoSet.add(nodeID);
    } else {
      undirectedEdgeNames.forEach((undirectedEdgeName) => {
        if (undirectedEdgeName in forwardEdgeMap) forwardEdgeMap[undirectedEdgeName][nodeID] = undefined;
        else forwardEdgeMap[undirectedEdgeName] = { [nodeID]: undefined };
      });
    }
  });

  const edgeMap = nodesByUndirectedEdges(nodeMap);

  // constructing the forwardNodeMap
  Object.entries(edgeMap).forEach(([edgeName, nodeIDs]) => {
    const [node0, node1] = nodeIDs;
    if (node0 in forwardNodeMap) forwardNodeMap[node0][edgeName] = node1;
    else forwardNodeMap[node0] = { [edgeName]: node1 };
    if (node1 in forwardNodeMap) forwardNodeMap[node1][edgeName] = node0;
    else forwardNodeMap[node1] = { [edgeName]: node0 };
  });

  let breaks = 0;

  // construcing all the chains
  while (edgeSet.size > 0) {
    const startEdge = edgeSet.values().next().value; // picking a random edge to start
    const { v0, v1 } = undirectedEdgesMap[startEdge][0];

    let localIsLoop = false;
    let edges: string[] = [];
    let nodes: string[] = [];

    if (degreeTwoSet.has(v1)) {
      // if v1 is a degree two node, we can start from it
      const { isLoop, edgeList, nodeList } = recursiveJoin(v1, v1, startEdge, forwardEdgeMap, forwardNodeMap);
      edges.push(...edgeList);
      nodes.push(...nodeList);

      if (isLoop) localIsLoop = true; // if the found chain is a loop we can stop
      else if (degreeTwoSet.has(v0)) {
        // otherwise we need to check whether there is a chain coming from v0 as well
        const { edgeList, nodeList } = recursiveJoin(v0, v0, startEdge, forwardEdgeMap, forwardNodeMap);
        edgeList.reverse().pop(); // removing the last edge as it has been added already when starting at v1
        edges = [...edgeList, ...edges];
        nodeList.reverse();
        nodes = [...nodeList, ...nodes];
      } else {
        nodes = [v0, ...nodes];
      }
    } else if (degreeTwoSet.has(v0)) {
      // else if v0 is a degree two node, we can start from it
      const { edgeList, nodeList } = recursiveJoin(v0, v0, startEdge, forwardEdgeMap, forwardNodeMap);
      edgeList.reverse();
      edges = edgeList;
      nodeList.reverse();
      nodes = [...nodeList, v1];
    } else {
      // else both v0 and v1 are end nodes, single segment chain
      edges = [startEdge];
      nodes = [v0, v1];
    }
    // clearing all the edges that were assigned
    edges.forEach((edge) => edgeSet.delete(edge));

    if (!localIsLoop && nodes[0] === nodes[nodes.length - 1]) {
      // taking care of edge case when the last / first node in the chain is actually also connected to other edges
      localIsLoop = true;
      nodes.pop();
    }

    chains.push({ isLoop: localIsLoop, edges, nodes });

    breaks++;

    if (breaks > nodeCount) {
      console.warn('Something went wrong, breaking out of the loop');
      break;
    }
  }

  return chains;
};
