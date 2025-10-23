# This script's only purpose is to force Spleeter to download its models
# so they are cached in the Docker image layer.

from spleeter.separator import Separator

print("Pre-caching Spleeter model...")

# Instantiating the Separator will trigger the download of the 'spleeter:2stems' model.
separator = Separator('spleeter:2stems', MWF=True)

print("Spleeter model cached successfully.")