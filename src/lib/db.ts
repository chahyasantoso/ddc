// Interface definitions for our journal data
export interface Checkpoint {
  id: number;
  location_name: string;
  lat: number;
  lng: number;
  description: string | null;
  scene_image: string | null;
  created_at: string;
}

export interface Photo {
  id: number;
  checkpoint_id: number;
  photo_url: string;
  caption: string;
  order: number;
  created_at: string;
}

export interface CheckpointWithPhotos extends Checkpoint {
  photos: Photo[];
}
