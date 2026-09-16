import React from 'react';
import Graph from 'react-force-graph-2d';
import type { BlockingChain, SessionInfo } from '../../types/api';

interface BlockingTreeProps {
  chains: BlockingChain[];
  onNodeClick?: (session: SessionInfo) => void;
  width?: number;
  height?: number;
}

export const BlockingTree: React.FC<BlockingTreeProps> = ({
  chains,
  onNodeClick,
  width = '100%',
  height = 400,
}) => {
  const graphRef = React.useRef<React.RefObject<Graph>>(React.createRef());
  const [highlightedNode, setHighlightedNode] = React.useState<string | null>(null);

  const { nodes, links } = React.useMemo(() => {
    const nodeMap = new Map<string, SessionInfo>();
    const linkSet = new Set<string>();

    chains.forEach((chain) => {
      const blockerKey = `${chain.blocker.sid},${chain.blocker.serial}`;
      nodeMap.set(blockerKey, chain.blocker);

      chain.blocked.forEach((blocked) => {
        const blockedKey = `${blocked.sid},${blocked.serial}`;
        nodeMap.set(blockedKey, blocked);
        linkSet.add(`${blockerKey}->${blockedKey}`);
      });
    });

    const nodes = Array.from(nodeMap.values()).map((session) => ({
      id: `${session.sid},${session.serial}`,
      ...session,
      val: 10,
      color: session.status === 'ACTIVE' ? '#D13438' : '#FF8C00',
    }));

    const links = Array.from(linkSet).map((link) => {
      const [source, target] = link.split('->');
      return { source, target, color: '#D13438', width: 2 };
    });

    return { nodes, links };
  }, [chains]);

  const handleNodeClick = (node: any) => {
    setHighlightedNode(node.id);
    onNodeClick?.(node);
  };

  return (
    <div style={{ width, height, border: '1px solid #E1E4E8', borderRadius: 4, background: '#fff' }}>
      <Graph
        ref={graphRef.current}
        graphData={{ nodes, links }}
        nodeAutoColorBy='status'
        nodeLabel={(node) => `${node.username || 'BG'}\nSID:${node.sid}`}
        nodeVal='val'
        nodeCanvasObject={(node, ctx, globals) => {
          const isBlocker = links.some((l) => l.source === node.id);
          const isHighlighted = highlightedNode === node.id;
          
          ctx.beginPath();
          const radius = 18;
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          
          if (isBlocker) {
            ctx.fillStyle = isHighlighted ? '#B02A2A' : '#D13438';
          } else {
            ctx.fillStyle = isHighlighted ? '#CC7000' : '#FF8C00';
          }
          ctx.fill();
          
          if (isHighlighted) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
          
          ctx.font = '11px Segoe UI';
          ctx.fillStyle = '#fff';
          ctx.textAlign = 'center';
          ctx.fillText(node.username || 'BG', node.x, node.y + 4);
        }}
        linkDirectionalArrowLength={8}
        linkDirectionalArrowColor='#D13438'
        linkDirectionalArrowRelPos={0.5}
        onNodeClick={handleNodeClick}
        onNodeRightClick={(node, event) => {
          event.preventDefault();
        }}
        enableNodeDrag={true}
        enableZoomPanInteraction={true}
        zoomToFit={true}
      />
    </div>
  );
};