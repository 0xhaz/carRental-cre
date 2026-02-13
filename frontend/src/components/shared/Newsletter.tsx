"use client";

import { useState, FormEvent } from "react";
import { Button, Input } from "@/components/ui";
import { toast } from "react-hot-toast";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    toast.success("Successfully subscribed to newsletter!");
    setEmail("");
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center space-y-2 max-md:px-4 my-10 mb-40">
      <h2 className="md:text-4xl text-2xl font-semibold text-gray-900">
        Never Miss a Deal!
      </h2>
      <p className="md:text-lg text-gray-500 pb-8">
        Subscribe to get the latest offers, new arrivals, and exclusive
        discounts
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 max-w-2xl w-full"
      >
        <Input
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" isLoading={isLoading} className="shrink-0">
          Subscribe
        </Button>
      </form>
    </div>
  );
}
