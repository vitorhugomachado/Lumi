import { Experience } from "@/components/app/Experience";
import { notFound } from "next/navigation";
const screens = [
  "boas-vindas",
  "publico",
  "objetivos",
  "inicio",
  "familia",
  "sons",
  "palavras",
  "animais",
  "objetos",
  "historias",
  "musicas",
  "progresso",
  "conquistas",
  "responsaveis",
  "configuracoes",
];
export default async function Page({
  params,
}: {
  params: Promise<{ screen: string }>;
}) {
  const { screen } = await params;
  if (!screens.includes(screen)) notFound();
  return <Experience screen={screen} />;
}
