import { redirect } from "next/navigation";
import { getLesson } from "@/db/queries";
import { LessonClient } from "./client";

interface Props {
  params: {
    lessonId: number;
  };
}

export default async function LessonPage({ params }: Props) {
  const lesson = await getLesson(params.lessonId);

  if (!lesson) {
    redirect("/learn");
  }

  return <LessonClient lesson={lesson} />;
}
