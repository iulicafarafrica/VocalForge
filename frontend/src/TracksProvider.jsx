import React, { useState } from "react";
import { TracksContext } from "./TracksContext";

export const TracksProvider = ({ children }) => {
  const [tracks, setTracks] = useState([]);

  const addTrack = (track) => setTracks(prev => [...prev, track]);
  const removeTrack = (index) => setTracks(prev => {
    const newTracks = [...prev];
    newTracks.splice(index, 1);
    return newTracks;
  });

  return (
    <TracksContext.Provider value={{ tracks, addTrack, removeTrack }}>
      {children}
    </TracksContext.Provider>
  );
};
