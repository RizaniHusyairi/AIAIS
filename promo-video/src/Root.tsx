import React from 'react';
import { Composition, Folder } from 'remotion';
import { Promo, SCENES, TOTAL } from './Promo';
import { FPS, H, W } from './theme';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Promo" component={Promo} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
    {/* Tiap adegan juga terdaftar sendiri agar mudah disunting dan dipratinjau terpisah. */}
    <Folder name="Adegan">
      {SCENES.map(({ id, C, dur }) => (
        <Composition key={id} id={`adegan-${id}`} component={C} durationInFrames={dur} fps={FPS} width={W} height={H} />
      ))}
    </Folder>
  </>
);
