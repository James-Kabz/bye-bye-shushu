export type MemoryCategory =
  | "Grandma and her GrandKids"
  | "Shushu and her Kids"
  | "Family Gatherings"
  | "Church Moments"
  | "Special Days"
  | "Other";

export type MemoryPhoto = {
  id: string;
  imageData: string;
  zoom: number;
  rotation: number;
  sortOrder: number;
};

export type Memory = {
  id: string;
  title: string;
  category: string;
  story: string | null;
  photos: MemoryPhoto[];
  createdAt: string;
};

export type CreateMemoryInput = {
  title: string;
  category: string;
  story?: string;
  photos: Array<{
    imageData: string;
    zoom: number;
    rotation: number;
  }>;
};
