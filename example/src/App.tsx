import { api } from "../convex/_generated/api";
import { useUploadFile } from "@convex-dev/r2/react";
import { Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useAction,
  useMutation,
  usePaginatedQuery,
  useQuery,
  useConvex,
} from "convex/react";
import { useDebouncedCallback } from "use-debounce";
import { Id } from "../convex/_generated/dataModel";
import { Separator } from "@/components/ui/separator";
import { MetadataTable } from "./MetadataTable";
import { GalleryImage } from "@/GalleryImage";
import { useState } from "react";

export default function App() {
  const convex = useConvex();
  const uploadFile = useUploadFile(api.example);
  const generateRandomImage = useAction(
    api.example.generateAndStoreRandomImage,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const updateImageCaption = useMutation(
    api.example.updateImageCaption,
  ).withOptimisticUpdate((localStore, args) => {
    // A small optimistic update function to synchronously update the UI while
    // the mutation is pending.
    const images = localStore.getQuery(api.example.listImages);
    const image = images?.find((image) => image._id === args.id);
    if (image && args.caption) {
      image.caption = args.caption;
    }
  });
  const deleteImage = useMutation(api.example.deleteObject);

  // Get images from your app's own `images` table
  const images = useQuery(api.example.listImages, {});

  // Get metadata from the R2 component's `metadata` table
  const metadata = usePaginatedQuery(
    api.example.listMetadata,
    {},
    { initialNumItems: 20 },
  );
  console.log("metadata", metadata.results.length);

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
    setUploadProgress(0);
    // `uploadFile` returns the key of the uploaded file, which you can use to
    // query that specific image
    const key = await uploadFile(event.target.files![0], {
      onProgress: ({ loaded, total }) => {
        setUploadProgress(Math.round((loaded / total) * 100));
      },
    });
    setUploadProgress(null);
    console.log("Uploaded image with key:", key);
  }

  // Debounce the updateImageCaption mutation to avoid blocking input changes.
  const debouncedUpdateImageCaption = useDebouncedCallback(
    (id: Id<"images">, caption: string) => {
      void updateImageCaption({ id, caption });
    },
    100,
    {
      maxWait: 100,
    },
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold my-4">Image Gallery</h1>

      <div className="mb-4 flex gap-2">
        <Button variant="outline" className="gap-2" asChild disabled={uploadProgress !== null}>
          <label htmlFor="image-upload" className="cursor-pointer">
            <Upload size={20} />
            {uploadProgress !== null ? `Uploading ${uploadProgress}%` : "Upload Image"}
          </label>
        </Button>
        <Button
          variant="outline"
          className="gap-2"
          onClick={async () => {
            setIsGenerating(true);
            try {
              console.log("Generating random image");
              await generateRandomImage();
              console.log("Random image generated");
            } catch (error) {
              console.error("Failed to generate image:", error);
            } finally {
              setIsGenerating(false);
            }
          }}
          disabled={isGenerating || !convex}
        >
          <Wand2 size={20} />
          {isGenerating ? "Generating..." : "Generate Random Image"}
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
          <GalleryImage
            key={image._id}
            image={image}
            onDelete={(key) => void deleteImage({ key })}
            onUpdateCaption={(id, caption) =>
              debouncedUpdateImageCaption(id, caption)
            }
          />
        ))}
      </div>

      <Separator className="my-12" />

      <h1 className="text-2xl font-bold mb-4">R2 Admin</h1>

      <div className="mb-4">
        <MetadataTable data={metadata.results ?? []} />
        {metadata.status === "CanLoadMore" && (
          <Button variant="outline" onClick={() => metadata.loadMore(10)}>
            Load More
          </Button>
        )}
      </div>
    </div>
  );
}
