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
  /** @deprecated Use scene_images instead. Kept for DB backward compat. */
  scene_image   : string | null;
  /** Ordered list of backdrop photo URLs for this checkpoint's scene slideshow. */
  scene_images  : string[];
  created_at    : string;
  photos        : Photo[];
}
