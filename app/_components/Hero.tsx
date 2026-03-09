"use client";
import React, { useState } from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Loader2, Send } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUICK_VIDEO_SUGGESTIONS } from "@/data/constant";
import axios from "axios";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

const Hero = () => {
  const [userInput, setUserInput] = useState("");
  const [type, setType] = useState("full-course");
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const router = useRouter();

  const GenerateCourseLayout = async () => {
    if (!userInput.trim()) {
      toast.error("Enter a topic first");
      return;
    }

    const toastId = toast.loading("Generating your course layout...");
    const courseId = globalThis.crypto?.randomUUID?.() ?? uuidv4();

    try {
      setLoading(true);

      const result = await axios.post("/api/generate-course-layout", {
        userInput,
        type,
        courseId: courseId,
      });
      console.log(result.data);
      setLoading(false);
      toast.success("Course layout generated succesfully!", { id: toastId });

      //navigate to course editor page
      router.push("/course/" + courseId);
    } catch (error) {
      setLoading(false);

      const message =
        error instanceof AxiosError
          ? error.response?.data?.error || error.message
          : "Something went wrong. Please try again.";

      console.error("Failed to generate course layout:", error);
      toast.error(message, { id: toastId });
    }
  };

  return (
    <div>
      <div className="flex items-center flex-col mt-20">
        <h2 className="text-4xl font-bold">
          Learn Smarter with{" "}
          <span className="text-primary">AI Video Courses</span>
        </h2>
        <p className="text-center text-gray-500 mt-3 text-xl">
          Turn Any Topic into a Complete Course
        </p>

        <div className="grid w-full max-w-xl bg-white z-10 mt-5 gap-6">
          <InputGroup>
            <InputGroupTextarea
              data-slot="input-group-control"
              className="flex field-sizing-content min-h-24 w-full resize-none rounded-xl 
              bg-white px-3 py-2.5 text-base transition-[color,box-shadow] outline-none md:text-sm"
              placeholder="Autoresize textarea..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
            />
            <InputGroupAddon align="block-end">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="">
                  <SelectValue placeholder="Full Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="full-course">Full Course</SelectItem>
                    <SelectItem value="quick-explain-video">
                      Quick Explain Video
                    </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              {user ? (
                <InputGroupButton
                  className="ml-auto"
                  size="icon-sm"
                  variant="default"
                  onClick={GenerateCourseLayout}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Send />}
                </InputGroupButton>
              ) : (
                <SignInButton mode="modal">
                  <InputGroupButton
                    className="ml-auto"
                    size="icon-sm"
                    variant="default"
                    onClick={GenerateCourseLayout}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <Send />}
                  </InputGroupButton>
                </SignInButton>
              )}
            </InputGroupAddon>
          </InputGroup>
        </div>
        <div className="flex gap-5 mt-5 max-w-3xl flex-wrap justify-center z-10">
          {QUICK_VIDEO_SUGGESTIONS.map((suggestion, index) => (
            <h2
              className="border rounded-2xl px-2 p-1 cursor-pointer text-sm bg-white"
              key={index}
              onClick={() => setUserInput(suggestion?.prompt)}
            >
              {suggestion.title}
            </h2>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
