import React from 'react';
import { Handle, Position } from 'reactflow';
import { 
  PlayIcon, 
  DocumentTextIcon, 
  AdjustmentsHorizontalIcon, 
  ClockIcon, 
  CogIcon 
} from '@heroicons/react/24/outline';

const nodeStyle = "bg-gray-800 border border-gray-700 rounded-md p-2 min-w-[140px] max-w-[200px] shadow-md relative";
const labelStyle = "text-xs font-semibold mb-1.5 flex items-center gap-1.5";
const contentStyle = "text-[10px] text-gray-400 bg-gray-900 p-1.5 rounded break-words leading-tight";
const inputHandleStyle = "w-2.5 h-2.5 bg-blue-400 border-2 border-gray-900 shadow-[0_0_5px_rgba(96,165,250,0.5)]";
const outputHandleStyle = "w-2.5 h-2.5 bg-emerald-400 border-2 border-gray-900 shadow-[0_0_5px_rgba(52,211,153,0.5)]";

export const TriggerNode = ({ data }) => {
  return (
    <div className={`${nodeStyle} border-green-500/50`}>
      <div className={`${labelStyle} text-green-400`}>
        <PlayIcon className="w-3.5 h-3.5" /> {data.label || 'Trigger Keyword'}
      </div>
      <div className={contentStyle}>
        {data.triggerKeyword ? (
          <span className="font-mono text-white px-1.5 py-0.5 bg-gray-800 rounded">"{data.triggerKeyword}"</span>
        ) : (
          <span className="italic text-gray-500">Every message</span>
        )}
      </div>
      <Handle type="source" position={Position.Right} className={outputHandleStyle} />
    </div>
  );
};

export const MessageNode = ({ data }) => {
  return (
    <div className={`${nodeStyle} border-blue-500/50`}>
      <Handle type="target" position={Position.Left} className={inputHandleStyle} />
      <div className={`${labelStyle} text-blue-400`}>
        <DocumentTextIcon className="w-3.5 h-3.5" /> {data.label || 'Message'}
      </div>
      <div className={contentStyle}>
        {data.text ? data.text.substring(0, 40) + (data.text.length > 40 ? '...' : '') : 'Empty message'}
      </div>
      <Handle type="source" position={Position.Right} className={outputHandleStyle} />
    </div>
  );
};

export const ConditionNode = ({ data }) => {
  return (
    <div className={`${nodeStyle} border-yellow-500/50`}>
      <Handle type="target" position={Position.Left} className={inputHandleStyle} />
      <div className={`${labelStyle} text-yellow-400`}>
        <AdjustmentsHorizontalIcon className="w-3.5 h-3.5" /> {data.label || 'Condition'}
      </div>
      <div className={contentStyle}>
        Wait for: <span className="font-mono text-white">{data.expectedAnswer || '[empty]'}</span>
      </div>
      <div className="flex justify-between mt-1.5 text-[9px] text-gray-500 uppercase tracking-wider px-1">
        <span className="text-green-500 font-semibold">True</span>
        <span className="text-red-500 font-semibold">False</span>
      </div>
      <Handle type="source" position={Position.Right} id="true" style={{ top: '35%' }} className={`${outputHandleStyle} !bg-green-500`} />
      <Handle type="source" position={Position.Right} id="false" style={{ top: '75%' }} className={`${outputHandleStyle} !bg-red-500`} />
    </div>
  );
};

export const DelayNode = ({ data }) => {
  return (
    <div className={`${nodeStyle} border-purple-500/50`}>
      <Handle type="target" position={Position.Left} className={inputHandleStyle} />
      <div className={`${labelStyle} text-purple-400`}>
        <ClockIcon className="w-3.5 h-3.5" /> {data.label || 'Delay'}
      </div>
      <div className={contentStyle}>
        Wait {data.delayMs ? data.delayMs / 1000 : 0} seconds
      </div>
      <Handle type="source" position={Position.Right} className={outputHandleStyle} />
    </div>
  );
};

export const ActionNode = ({ data }) => {
  return (
    <div className={`${nodeStyle} border-pink-500/50`}>
      <Handle type="target" position={Position.Left} className={inputHandleStyle} />
      <div className={`${labelStyle} text-pink-400`}>
        <CogIcon className="w-3.5 h-3.5" /> {data.label || 'Action'}
      </div>
      <div className={contentStyle}>
        {data.actionType || 'No action selected'}
      </div>
      <Handle type="source" position={Position.Right} className={outputHandleStyle} />
    </div>
  );
};

export const EndNode = ({ data }) => {
  return (
    <div className={`${nodeStyle} border-red-500/50`}>
      <Handle type="target" position={Position.Left} className={inputHandleStyle} />
      <div className={`${labelStyle} text-red-500`}>
        <div className="w-3.5 h-3.5 rounded-full bg-red-500 flex items-center justify-center">
           <div className="w-1.5 h-1.5 bg-gray-900 rounded-full"></div>
        </div>
        {data.label || 'End Flow'}
      </div>
      <div className={contentStyle}>
        Flow ends here.
      </div>
    </div>
  );
};

export const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  condition: ConditionNode,
  delay: DelayNode,
  action: ActionNode,
  end: EndNode
};
