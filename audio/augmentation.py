import librosa


def pitch_augment(audio, sr):

    shifts = [-4, -2, 2, 4]

    augmented = []

    for s in shifts:

        shifted = librosa.effects.pitch_shift(
            audio,
            sr=sr,
            n_steps=s
        )

        augmented.append(shifted)

    return augmented


def speed_augment(audio, sr):

    speeds = [0.9, 1.1]

    augmented = []

    for sp in speeds:

        stretched = librosa.effects.time_stretch(audio, sp)

        augmented.append(stretched)

    return augmented