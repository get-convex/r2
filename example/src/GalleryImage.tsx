import { api } from "../convex/_generated/api";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Id } from "../convex/_generated/dataModel";
import { useRef, useState } from "react";

export const GalleryImage = ({
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
  const [inputIsFocused, setInputIsFocused] = useState(false);
  const [caption, setCaption] = useState(image.caption);

  const handleUpdateCaption = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCaption(e.target.value);
    onUpdateCaption(image._id, e.target.value);
  };

  if (!inputIsFocused && image.caption !== caption) {
    setCaption(image.caption);
  }

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
          onFocus={() => {
            setInputIsFocused(true);
          }}
          onBlur={() => {
            setInputIsFocused(false);
          }}
        />
      </div>
    </div>
  );
};
