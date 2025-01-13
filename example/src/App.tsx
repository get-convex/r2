import { api } from "../convex/_generated/api";
import { useUploadFile } from "@convex-dev/r2/react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";
import { Id } from "../convex/_generated/dataModel";
import { useRef, useState } from "react";

const Image = ({
  image,
  onDelete,
  onUpdateCaption,
}: {
  // You can reuse the return types of your convex functions
  image: (typeof api.example.listImages._returnType)[number];
  onDelete: (key: string) => void;
  onUpdateCaption: (id: Id<"images">, caption: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState(image.caption);

  const handleUpdateCaption = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
    onUpdateCaption(image._id, e.target.value);
  };

  return (
    <div key={image._id} className="relative group rounded-lg overflow-hidden">
      <img
        src={image.url}
        alt={image.caption || "Gallery image"}
        className="w-full h-64 object-cover"
      />
      <button
        onClick={() => onDelete(image.key)}
        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Delete image"
      >
        <X size={20} />
      </button>
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-2">
        <Input
          ref={inputRef}
          type="text"
          value={caption}
          onChange={handleUpdateCaption}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              inputRef.current?.blur();
            }
          }}
          placeholder="Add a caption"
          className="w-full text-white placeholder:text-white placeholder:text-opacity-60 bg-transparent border-none focus:outline-none focus:ring-0"
          aria-label="Image caption"
        />
      </div>
    </div>
  );
};

export default function App() {
  // Returns a function that uploads the file to R2, syncs metadata to the
  // Convex database, and returns the key of the uploaded file in case you need
  // it.
  const uploadFile = useUploadFile(api.example);
  const updateImageCaption = useMutation(
    api.example.updateImageCaption
  ).withOptimisticUpdate((localStore, args) => {
    // A small optimistic update function to synchronously update the UI while
    // the mutation is pending.
    const images = localStore.getQuery(api.example.listImages);
    const image = images?.find((image) => image._id === args.id);
    if (image) {
      image.caption = args.caption;
    }
  });
  const deleteImage = useMutation(api.example.deleteObject);
  const images = useQuery(api.example.listImages, {});

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    await uploadFile(event.target.files![0]);
  }

  // Debounce the updateImageCaption mutation to avoid blocking input changes.
  // Persists whenever the user stops typing for 500ms.
  const debouncedUpdateImageCaption = useDebouncedCallback(
    (id: Id<"images">, caption: string) => {
      void updateImageCaption({ id, caption });
    },
    500
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Image Upload Gallery</h1>

      <div className="mb-4">
        <Button variant="outline" className="gap-2" asChild>
          <label htmlFor="image-upload" className="cursor-pointer">
            <Upload size={20} />
            Upload Image
          </label>
        </Button>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleUpload}
          className="hidden"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images?.map((image) => (
          <Image
            key={image._id}
            image={image}
            onDelete={(key) => void deleteImage({ key })}
            onUpdateCaption={(id, caption) =>
              debouncedUpdateImageCaption(id, caption)
            }
          />
        ))}
      </div>
    </div>
  );
}
