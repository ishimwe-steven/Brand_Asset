from services.logo_quality_service import verify_logo_quality

image_path = "test-images/logo.jpg"

result = verify_logo_quality(image_path)

print(result)