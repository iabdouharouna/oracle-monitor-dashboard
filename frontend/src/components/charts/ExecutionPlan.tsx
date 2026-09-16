import React, { useState } from 'react';
import { Collapse, IconButton, Box, Typography } from '@mui/material';
import { ExpandMore, ExpandLess, Memory, Storage, Speed } from '@mui/icons-material';
import type { ExecutionPlanStep } from '../../types/api';

interface ExecutionPlanProps {
  plan: ExecutionPlanStep[];
  onSelect?: (step: ExecutionPlanStep) => void;
}

const operationColors: Record<string, string> = {
  'TABLE ACCESS': '#0066CC',
  'INDEX': '#00A651',
  'JOIN': '#FF8C00',
  'SORT': '#8B5CF6',
  'AGGREGATE': '#EC4899',
  'VIEW': '#6B7280',
  'FILTER': '#F59E0B',
  'PARTITION': '#06B6D4',
  'REMOTE': '#84CC16',
  'DEFAULT': '#9CA3AF',
};

const getOperationColor = (operation: string) => {
  const key = Object.keys(operationColors).find((k) => operation.includes(k));
  return key ? operationColors[key] : operationColors.DEFAULT;
};

const getIcon = (operation: string) => {
  if (operation.includes('TABLE')) return <Memory fontSize="small" color="action" />;
  if (operation.includes('INDEX')) return <Storage fontSize="small" color="action" />;
  if (operation.includes('SORT') || operation.includes('AGGREGATE')) return <Speed fontSize="small" color="action" />;
  return null;
};

const buildTree = (steps: ExecutionPlanStep[], parentId: number | null = null): ExecutionPlanStep[] => {
  return steps.filter((s) => s.parentId === parentId);
};

interface PlanNodeProps {
  step: ExecutionPlanStep;
  allSteps: ExecutionPlanStep[];
  expanded: Set<number>;
  onToggle: (id: number) => void;
  onSelect: (step: ExecutionPlanStep) => void;
  depth: number;
}

const PlanNode: React.FC<PlanNodeProps> = ({ step, allSteps, expanded, onToggle, onSelect, depth }) => {
  const children = buildTree(allSteps, step.id);
  const hasChildren = children.length > 0;
  const isExpanded = expanded.has(step.id);
  const color = getOperationColor(step.operation);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          padding: '4px 8px',
          paddingLeft: `${16 + depth * 24}px`,
          borderRadius: 1,
          cursor: hasChildren ? 'default' : 'pointer',
          '&:hover': { backgroundColor: 'rgba(0,102,204,0.05)' },
        }}
        onClick={() => onSelect(step)}
      >
        {hasChildren ? (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(step.id);
            }}
            sx={{ padding: 0.25 }}
          >
            {isExpanded ? <ExpandMore fontSize="small" /> : <ExpandLess fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 32 }} />
        )}
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: 1,
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
        {getIcon(step.operation)}
        <Typography variant="body2" sx={{ fontWeight: 500 }}>
          {step.operation}
        </Typography>
        {step.options && (
          <Typography variant="caption" sx={{ color: '#605E5C', fontStyle: 'italic' }}>
            {step.options}
          </Typography>
        )}
        {step.objectName && (
          <Typography variant="body2" sx={{ color: '#0066CC', fontWeight: 500 }}>
            {step.objectName}
          </Typography>
        )}
        <Box sx={{ ml: 'auto', display: 'flex', gap: 2, fontSize: '0.7rem', color: '#605E5C' }}>
          <Typography>Cost: {step.cost}</Typography>
          <Typography>Rows: {step.cardinality?.toLocaleString()}</Typography>
          <Typography>Bytes: {(step.bytes / 1024).toFixed(1)} KB</Typography>
        </Box>
      </Box>
      {hasChildren && (
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          {children.map((child) => (
            <PlanNode
              key={child.id}
              step={child}
              allSteps={allSteps}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </Collapse>
      )}
    </Box>
  );
};

export const ExecutionPlan: React.FC<ExecutionPlanProps> = ({ plan, onSelect }) => {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([1]));
  const handleSelect = onSelect ?? (() => undefined);
  const handleToggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!plan.length) {
    return (
      <Box sx={{ p: 3, textAlign: 'center', color: '#605E5C' }}>
        No execution plan available
      </Box>
    );
  }

  const rootSteps = buildTree(plan);

  return (
    <Box sx={{ maxHeight: 500, overflow: 'auto', border: '1px solid #E1E4E8', borderRadius: 1 }}>
      {rootSteps.map((step) => (
        <PlanNode
          key={step.id}
          step={step}
          allSteps={plan}
          expanded={expanded}
          onToggle={handleToggle}
          onSelect={handleSelect}
          depth={0}
        />
      ))}
    </Box>
  );
};