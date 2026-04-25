export interface ImageData {
  id: string;
  url: string;
  name: string;
  width: number;
  height: number;
  type: string;
}

export interface PrintSettings {
  targetWidthInches: number;
  targetHeightInches: number;
  targetDpi: number;
}
