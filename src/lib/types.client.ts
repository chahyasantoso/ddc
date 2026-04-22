// Client-safe types (no DB imports)
// Used by all React components in the scrollytelling UI.

export interface Photo {
  id           : number;
  checkpoint_id: number;
  photo_url    : string;
  caption      : string;
  order        : number;
  is_backdrop  : number;
}

export interface Checkpoint {
  id            : number;
  location_name : string;
  lat           : number;
  lng           : number;
  description   : string | null;
  /** @deprecated Kept for DB backward compat. Native backdrops live in photos[]. */
  scene_image   : string | null;
  created_at    : string;
  photos        : Photo[];
}

/** Payload for the full-screen photo modal. */
export interface ActiveModal {
  photo : Photo;
  rotate: number;
}

/** 
 * Central contract for scrollytelling animations. 
 * Decouples the content from the scroll timeline.
 */
export interface AnimationDirective {
  id: string;
  type: 'photo' | 'backdrop';
  /** When the animation 0->1 starts */
  startVH: number;
  /** When the animation 0->1 finishes (fully revealed) */
  endVH: number;
  /** For photos: when the NEXT polaroid starts its animation (start of push-back) */
  coverVH?: number;
  /** For backdrops: when the next backdrop starts to entry (or checkpoint ends) */
  exitStartVH?: number;
  /** For backdrops: when the exit animation should be finished */
  exitEndVH?: number;
}
