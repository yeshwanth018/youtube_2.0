"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

export default function CategoryTabs() {
  const [activeCategory, setActiveCategory] = useState("All");

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto lg:flex-wrap scrollbar-hide pb-2">
      {categories.map((category) => {
        const isActive = activeCategory === category;
        return (
          <Button
            key={category}
            variant="ghost"
            className={`whitespace-nowrap transition-colors rounded-full ${isActive ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </Button>
        );
      })}
    </div>
  );
}
