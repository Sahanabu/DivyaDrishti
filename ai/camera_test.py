import cv2

camera = cv2.VideoCapture(1)

if not camera.isOpened():
    print("ERROR: Camera could not be opened.")
    exit()

print("Camera started successfully.")
print("Press Q to exit.")

while True:
    ret, frame = camera.read()

    if not ret:
        print("ERROR: Could not read frame.")
        break

    cv2.imshow("DivyaDrishti - Camera Test", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

camera.release()
cv2.destroyAllWindows()
