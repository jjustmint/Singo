from spleeter.separator import Separator

print("Pre-caching Spleeter model...")

separator = Separator('spleeter:2stems', MWF=True)

print("Spleeter model cached successfully.")