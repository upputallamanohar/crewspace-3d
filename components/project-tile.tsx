'use client';

import { useRef, type CSSProperties, type PointerEvent } from 'react';
import type { Project } from '@/lib/projects';
import './project-tile.css';

type ProjectTileProps = {
  project: Project;
  index: number;
  onOpen: (project: Project) => void;
  motion?: boolean;
};

function Paper({ className = '', check = false }: { className?: string; check?: boolean }) {
  return <span className={`pt-paper ${className}`}>
    {check ? <span className="pt-paper-check">✓</span> : <><i /><i /><i /></>}
  </span>;
}

function Cube({ className = '' }: { className?: string }) {
  return <span className={`pt-cube ${className}`}>
    <i className="pt-face pt-front" /><i className="pt-face pt-back" />
    <i className="pt-face pt-left" /><i className="pt-face pt-right" />
    <i className="pt-face pt-top" /><i className="pt-face pt-bottom" />
  </span>;
}

function Sculpture({ index }: { index: number }) {
  const kind = index % 10;
  return <span className={`pt-art pt-art-${kind}`} aria-hidden="true">
    <span className="pt-art-shadow" />
    <span className="pt-sculpture">
      {kind === 0 && <span className="pt-paper-stack"><Paper className="pt-sheet-back" /><Paper className="pt-sheet-middle" /><Paper className="pt-sheet-front" /><span className="pt-pencil" /></span>}
      {kind === 1 && <span className="pt-orbit"><span className="pt-orbit-ring pt-orbit-ring-a" /><span className="pt-orbit-ring pt-orbit-ring-b" /><span className="pt-planet" /><span className="pt-satellite" /></span>}
      {kind === 2 && <span className="pt-conversation"><span className="pt-talk pt-talk-back"><i /><i /><i /></span><span className="pt-talk pt-talk-front"><i /><i /><i /></span><span className="pt-talk-dot" /></span>}
      {kind === 3 && <span className="pt-bars"><Cube className="pt-bar pt-bar-one" /><Cube className="pt-bar pt-bar-two" /><Cube className="pt-bar pt-bar-three" /><span className="pt-chart-dot" /></span>}
      {kind === 4 && <span className="pt-support"><span className="pt-support-arch" /><span className="pt-ear pt-ear-left" /><span className="pt-ear pt-ear-right" /><span className="pt-support-spark">✦</span></span>}
      {kind === 5 && <span className="pt-resume"><Paper className="pt-sheet-back" /><Paper className="pt-sheet-front" /><span className="pt-resume-seal">✦</span><span className="pt-resume-person"><i /></span></span>}
      {kind === 6 && <span className="pt-cube-world"><Cube /><span className="pt-cube-orbit" /><span className="pt-cube-dot" /></span>}
      {kind === 7 && <span className="pt-remix"><span className="pt-remix-ring pt-remix-one" /><span className="pt-remix-ring pt-remix-two" /><span className="pt-remix-ring pt-remix-three" /><span className="pt-remix-ball" /></span>}
      {kind === 8 && <span className="pt-compass"><span className="pt-compass-base" /><span className="pt-compass-inner" /><span className="pt-compass-needle" /><span className="pt-compass-center" /><span className="pt-compass-star">✦</span></span>}
      {kind === 9 && <span className="pt-approval"><Paper className="pt-sheet-back" /><Paper className="pt-sheet-middle" /><Paper className="pt-sheet-front" check /><span className="pt-approval-ball" /></span>}
    </span>
  </span>;
}

export default function ProjectTile({ project, index, onOpen, motion = true }: ProjectTileProps) {
  const ref = useRef<HTMLButtonElement>(null);
  function tilt(event: PointerEvent<HTMLButtonElement>) {
    if (!motion || event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    event.currentTarget.style.setProperty('--pt-rotate-x', `${(0.5 - y) * 10}deg`);
    event.currentTarget.style.setProperty('--pt-rotate-y', `${(x - 0.5) * 12}deg`);
    event.currentTarget.style.setProperty('--pt-pointer-x', `${x * 100}%`);
    event.currentTarget.style.setProperty('--pt-pointer-y', `${y * 100}%`);
  }
  function reset() {
    ref.current?.style.setProperty('--pt-rotate-x', '0deg');
    ref.current?.style.setProperty('--pt-rotate-y', '0deg');
  }

  return <button ref={ref} type="button" className={`pt-card pt-palette-${index % 10}${motion ? '' : ' pt-still'}`} style={{ '--pt-delay': `${index * -0.47}s` } as CSSProperties} onPointerMove={tilt} onPointerLeave={reset} onClick={() => onOpen(project)} aria-label={`Open ${project.title}`}>
    <span className="pt-glint" aria-hidden="true" />
    <span className="pt-topline"><span className="pt-number">{project.number}</span><span className="pt-category">{project.category}</span></span>
    <Sculpture index={index} />
    <span className="pt-copy"><span className="pt-title">{project.title}</span><span className="pt-description">{project.description}</span></span>
    <span className="pt-footer"><span>Open project</span><span className="pt-open-arrow" aria-hidden="true">↗</span></span>
  </button>;
}
