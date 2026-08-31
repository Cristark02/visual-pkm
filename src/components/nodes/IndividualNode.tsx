import { memo, useEffect, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { resolveLocalMedia } from '../../lib/mediaResolver';
import type { NodeData } from '../../types/store';

const getInitials = (given?: string, family?: string) => {
  const g = given ? given.charAt(0) : '';
  const f = family ? family.charAt(0) : '';
  return (g + f).toUpperCase();
};

const hashCode = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return hash;
};

const intToRGB = (i: number) => {
  const c = (i & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + '00000'.substring(0, 6 - c.length) + c;
};

const IndividualNode = ({ data }: NodeProps<NodeData>) => {
  const { identity, mediaReferences } = data;
  const computedShape = data.biographicalAttributes?.shape || 'circle';
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (mediaReferences?.primaryAvatarPath) {
      resolveLocalMedia(mediaReferences.primaryAvatarPath).then((url) => {
        if (active && url) setAvatarUrl(url);
      });
    }
    return () => { active = false; };
  }, [mediaReferences?.primaryAvatarPath]);

  const fullName = `${identity?.givenName || ''} ${identity?.familyName || ''}`.trim();
  const initials = getInitials(identity?.givenName, identity?.familyName);
  const bgColor = intToRGB(hashCode(fullName));

  // Para el corazón en CSS puro es más fácil usar un div contenedor y SVG
  const isHeart = computedShape === 'heart';
  const isStar = computedShape === 'star';

  let shapeClasses = 'w-16 h-16 bg-white border-2 border-gray-400 shadow-sm flex items-center justify-center overflow-hidden';
  
  if (computedShape === 'circle') shapeClasses += ' rounded-full';
  else if (computedShape === 'square') shapeClasses += ' rounded-xl';

  return (
    <div className="flex flex-col items-center justify-center group cursor-pointer">
      <Handle type="target" position={Position.Top} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div 
        className={shapeClasses}
        style={{ 
          backgroundColor: avatarUrl ? 'transparent' : bgColor,
          clipPath: isStar ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' : 
                    isHeart ? 'path("M32,12 c-8,-14 -32,-10 -32,8 c0,12 14,25 32,42 c18,-17 32,-30 32,-42 c0,-18 -24,-22 -32,-8 z")' : 'none',
        }}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white font-bold text-lg">{initials}</span>
        )}
      </div>

      <div className="mt-2 px-2 py-1 bg-white/80 backdrop-blur text-xs font-medium text-gray-800 rounded shadow-sm opacity-90 group-hover:opacity-100 whitespace-nowrap">
        {fullName || 'Desconocido'}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
};

export default memo(IndividualNode);
