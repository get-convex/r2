import "./App.css";
import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useRef, useState } from "react";
import { api } from "../convex/_generated/api";

export function App() {
  const generateUploadUrl = useAction(api.example.generateUploadUrl);
  const sendImage = useMutation(api.example.sendImage);
  const deleteImage = useAction(api.example.deleteImage);
  const images = useQuery(api.example.getRecentImages);
  const imageInput = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));

  async function handleSendImage(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    // Step 1: Get a short-lived upload URL
    const { url, key } = await generateUploadUrl();
    // Step 2: PUT the file to the URL
    const result = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": selectedImage!.type },
      body: selectedImage,
    });
    if (!result.ok) {
      setSending(false);
      throw new Error(`Failed to upload image: ${result.statusText}`);
    }
    // Step 3: Save the newly allocated storage id to the database
    await sendImage({ storageId: key, author: name });
    setSending(false);
    setSelectedImage(null);
    imageInput.current!.value = "";
  }

  return (
    <>
      <h1>Convex R2 Component Example</h1>
      <div className="card">
        <form onSubmit={handleSendImage}>
          <input
            type="file"
            accept="image/*"
            ref={imageInput}
            onChange={(event) => setSelectedImage(event.target.files![0])}
            disabled={selectedImage !== null}
          />
          <input
            type="submit"
            value={sending ? "Sending..." : "Send Image"}
            disabled={sending || selectedImage === null}
          />
        </form>
        <div>
          {images?.map((image) => (
            <div key={image._id} className="image-row">
              <p>{image.author}</p>
              <img src={image.url} alt={image.author} width={80} />
              <button
                onClick={() => deleteImage({ storageId: image.storageId })}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <p>
          See <code>example/convex/example.ts</code> for all the ways to use
          this component
        </p>
      </div>
    </>
  );
}

export default App;
