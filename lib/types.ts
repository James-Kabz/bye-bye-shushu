export type MemoryCategory =
  | "Grandma and her GrandKids"
  | "Shushu and her Kids"
  | "Family Gatherings"
  | "Church Moments"
  | "Special Days"
  | "Other";

export type Memory = {
  id: string;
  title: string;
  category: string;
  story: string | null;
  imageData: string;
  zoom: number;
  rotation: number;
  createdAt: string;
};

export type CreateMemoryInput = {
  title: string;
  category: string;
  story?: string;
  imageData: string;
  zoom: number;
  rotation: number;
};
