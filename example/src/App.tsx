import "./App.css";
import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useRef, useState } from "react";
import { api } from "../convex/_generated/api";
import { useUploadFile } from "@convex-dev/r2/react";

export function App() {
  const uploadFile = useUploadFile(api.example);
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
    const key = await uploadFile(selectedImage!);
    await sendImage({ key, author: name });
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
              <button onClick={() => deleteImage({ key: image.key })}>
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
