import "./App.css";
import { useAction, useMutation, useQuery } from "convex/react";
import { FormEvent, useRef, useState } from "react";
import { api } from "../convex/_generated/api";

// Set to true to use HTTP Action instead of signed URL
const GET_VIA_HTTP = true;
const SEND_VIA_HTTP = true;

export function App() {
  const generateUploadUrl = useAction(api.example.generateUploadUrl);
  const sendImage = useMutation(api.example.sendImage);
  const deleteImage = useAction(api.example.deleteImage);
  const images = useQuery(api.example.getRecentImages);
  const imageInput = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const [name] = useState(() => "User " + Math.floor(Math.random() * 10000));

  async function handleSendImageViaSignedUrl(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    // Step 1: Get a short-lived upload URL
    const { url, key } = await generateUploadUrl();
    // Step 2: PUT the file to the URL
    try {
      const result = await fetch(url, {
        method: "PUT",
        headers: { "Content-Type": selectedImage!.type },
        body: selectedImage,
      });
      if (!result.ok) {
        setSending(false);
        throw new Error(`Failed to upload image: ${result.statusText}`);
      }
    } catch (error) {
      setSending(false);
      throw new Error(`Failed to upload image: ${error}`);
    }
    // Step 3: Save the newly allocated storage id to the database
    await sendImage({ key, author: name });
    setSending(false);
    setSelectedImage(null);
    imageInput.current!.value = "";
  }

  async function handleSendImageViaHttp(event: FormEvent) {
    event.preventDefault();
    setSending(true);

    const sendImageUrl = new URL(
      // Use Convex Action URL
      "https://giant-kangaroo-636.convex.site/r2/send"
    );
    sendImageUrl.searchParams.set("author", name);

    try {
      const result = await fetch(sendImageUrl, {
        method: "POST",
        headers: { "Content-Type": selectedImage!.type },
        body: selectedImage,
      });
      if (!result.ok) {
        setSending(false);
        throw new Error(`Failed to upload image: ${result.statusText}`);
      }
    } catch (error) {
      setSending(false);
      throw new Error(`Failed to upload image: ${error}`);
    }

    setSending(false);
    setSelectedImage(null);
    imageInput.current!.value = "";
  }

  return (
    <>
      <h1>Convex R2 Component Example</h1>
      <div className="card">
        <form
          onSubmit={
            SEND_VIA_HTTP ? handleSendImageViaHttp : handleSendImageViaSignedUrl
          }
        >
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
              <img
                src={
                  GET_VIA_HTTP
                    ? `https://giant-kangaroo-636.convex.site/r2/get/${image.key}`
                    : image.url
                }
                alt={image.author}
                width={80}
              />
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
