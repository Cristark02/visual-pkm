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

  let shapeClasses = `w-20 h-20 shadow-lg overflow-hidden flex items-center justify-center transition-all duration-300 ${selected ? 'ring-4 ring-blue-500 scale-105' : 'border border-gray-200 hover:shadow-xl hover:scale-105'}`;
  
  const isStar = computedShape === 'star';
  const isHeart = computedShape === 'heart';
  
  if (computedShape === 'circle') shapeClasses += ' rounded-full';
  else if (computedShape === 'square') shapeClasses += ' rounded-2xl';

  return (
    <div className="flex flex-col items-center justify-center group cursor-pointer relative" onDoubleClick={handleDoubleClick}>
      <Handle 
        type="source" 
        position={Position.Top} 
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', opacity: 0, zIndex: 10, cursor: 'crosshair' }} 
      />
      <Handle 
        type="target" 
        position={Position.Top} 
        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80px', height: '80px', opacity: 0, zIndex: 9 }} 
      />
      
      <div 
        className={shapeClasses}
        style={{
          backgroundColor: avatarUrl ? 'transparent' : bgColor,
          clipPath: isStar ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 
                    isHeart ? 'path("M40,20 c-10,-17 -40,-12 -40,10 c0,15 17,31 40,52 c23,-21 40,-37 40,-52 c0,-22 -30,-27 -40,-10 z")' : 'none',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-xl font-bold text-white/90 drop-shadow-md select-none">{getInitials(givenName, familyName)}</span>
        )}
      </div>

      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-gray-100 z-20">
        {isEditing ? (
          <input 
            ref={inputRef}
            value={editName}
            onChange={e => setEditName(e.target.value)}
            onBlur={saveName}
            onKeyDown={onKeyDown}
            className="bg-transparent outline-none w-20 text-center text-blue-600 font-bold"
          />
        ) : (
          fullName || 'Desconocido'
        )}
      </div>
    </div>
  );
};

export default memo(IndividualNode);
