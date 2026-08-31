import { memo, useEffect, useState, useRef } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { resolveLocalMedia } from '../../lib/mediaResolver';
import { useStore } from '../../store/useStore';
import type { NodeData } from '../../types/store';

const getInitials = (given?: string, family?: string) => {
  const g = given ? given.charAt(0) : '';
  const f = family ? family.charAt(0) : '';
  return (g + f).toUpperCase();
};

const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const IndividualNode = ({ id, data, selected }: NodeProps<NodeData>) => {
  const { updateNodeData } = useStore();
  const { identity, mediaReferences } = data;
  const computedShape = data.biographicalAttributes?.shape || 'circle';
  
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mediaReferences?.primaryAvatarPath) {
      resolveLocalMedia(mediaReferences.primaryAvatarPath).then(setAvatarUrl);
    }
  }, [mediaReferences]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const givenName = identity?.givenName || '';
  const familyName = identity?.familyName || '';
  const fullName = [givenName, familyName].filter(Boolean).join(' ');
  const bgColor = stringToColor(fullName);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditName(givenName);
    setIsEditing(true);
  };

  const saveName = () => {
    updateNodeData(id, { identity: { givenName: editName, familyName } });
    setIsEditing(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') saveName();
    if (e.key === 'Escape') setIsEditing(false);
  };

  let shapeClasses = `w-20 h-20 shadow-lg flex items-center justify-center transition-all duration-300 relative z-10 ${selected ? 'ring-4 ring-indigo-500 scale-105' : 'border border-gray-200 hover:shadow-xl hover:scale-105'}`;
  
  if (computedShape === 'circle') shapeClasses += ' rounded-full';
  else if (computedShape === 'square') shapeClasses += ' rounded-2xl';

  // Define custom clip-paths for non-standard shapes
  const clipPaths: Record<string, string> = {
    star: 'polygon(50% 0%, 65% 35%, 100% 40%, 75% 65%, 85% 100%, 50% 80%, 15% 100%, 25% 65%, 0% 40%, 35% 35%)',
    heart: 'polygon(50% 100%, 10% 60%, 0% 30%, 15% 0%, 50% 25%, 85% 0%, 100% 30%, 90% 60%)',
    hexagon: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)',
    diamond: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
    triangle: 'polygon(50% 0%, 100% 100%, 0% 100%)',
    pentagon: 'polygon(50% 0%, 100% 38%, 81% 100%, 19% 100%, 0% 38%)',
    octagon: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
    shield: 'polygon(0% 0%, 100% 0%, 100% 75%, 50% 100%, 0% 75%)'
  };

  const clipPathStyle = clipPaths[computedShape] || 'none';

  return (
    <div className="flex flex-col items-center justify-center group cursor-pointer relative" onDoubleClick={handleDoubleClick}>
      {/* Central handles - Larger for fat fingers on mobile */}
      <Handle 
        type="source" 
        position={Position.Top} 
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '36px', height: '36px', opacity: 0, zIndex: 30, cursor: 'crosshair' }} 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '36px', height: '36px', opacity: 0, zIndex: 29 }} 
      />
      
      {/* Visual crosshair hint on hover in the center. Always slightly visible on mobile, fully visible on hover for desktop */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm text-white flex items-center justify-center opacity-30 sm:opacity-0 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
        <span className="text-[12px] font-bold">+</span>
      </div>

      <div 
        className={shapeClasses}
        style={{
          backgroundColor: avatarUrl ? 'transparent' : bgColor,
          clipPath: clipPathStyle
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover pointer-events-none" />
        ) : (
          <span className="text-xl font-bold text-white/90 drop-shadow-md select-none pointer-events-none">{getInitials(givenName, familyName)}</span>
        )}
      </div>

      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-gray-100 z-30">
        {isEditing ? (
          <input 
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={onKeyDown}
            className="bg-transparent outline-none w-20 text-center text-indigo-600 font-bold"
          />
        ) : (
          fullName || 'Desconocido'
        )}
      </div>
    </div>
  );
};

export default memo(IndividualNode);
