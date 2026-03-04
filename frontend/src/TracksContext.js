import { createContext } from "react";

export const TracksContext = createContext({
  tracks: [],
  addTrack: (track) => {},
  removeTrack: (index) => {}
});
