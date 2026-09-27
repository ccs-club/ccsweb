import HomeClient from "./home-client";
import { localizedMetadata, localeFromSearchParams } from "./page-metadata";

export async function generateMetadata({ searchParams }: PageProps<"/">) {
  return localizedMetadata("home", localeFromSearchParams(await searchParams));
}

export default function Home() {
  return <HomeClient />;
}
