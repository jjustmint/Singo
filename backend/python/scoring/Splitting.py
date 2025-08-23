from spleeter.separator import Separator

if __name__ == "__main__":
    # Use 2-stem separation (vocals + accompaniment) with MWF for better quality
    separator = Separator('spleeter:2stems', MWF=True)

    # Process the audio file
    separator.separate_to_file('test2.mp3', 'output_directory')

