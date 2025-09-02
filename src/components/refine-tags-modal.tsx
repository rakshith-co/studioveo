"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { type VideoFile } from "@/app/page";
import { Loader2 } from "lucide-react";

interface RefineTagsModalProps {
  video: VideoFile;
  onOpenChange: (open: boolean) => void;
  onRefine: (video: VideoFile, feedback: string) => Promise<boolean>;
}

const formSchema = z.object({
  feedback: z.string().min(5, {
    message: "Feedback must be at least 5 characters.",
  }),
});

export function RefineTagsModal({ video, onOpenChange, onRefine }: RefineTagsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      feedback: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const success = await onRefine(video, values.feedback);
    setIsSubmitting(false);
    if (success) {
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={!!video} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] glassmorphic border-primary/20">
        <DialogHeader>
          <DialogTitle>Refine Video Tags</DialogTitle>
          <DialogDescription>
            Provide feedback to improve the generated tags for this video.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <div className="space-y-2">
                <h4 className="font-medium text-sm">Original Tags</h4>
                <p className="text-sm p-3 bg-black/20 rounded-md text-muted-foreground break-words">{video.tags}</p>
            </div>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                <FormField
                control={form.control}
                name="feedback"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Your Feedback</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="e.g., 'This is a kitchen, not a living room. Add 'modern appliances' tag.'"
                        {...field}
                        className="bg-black/20"
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Refine Tags
                    </Button>
                </DialogFooter>
            </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
