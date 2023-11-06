import { PreferencesPage } from "@/app/[locale]/(admin)/settings/preferences/preferences-page";
import { Params } from "@/app/[locale]/types";
import { getTranslation } from "@/app/i18n";

export default function Page() {
  return <PreferencesPage />;
}

export async function generateMetadata({ params }: { params: Params }) {
  const { t } = await getTranslation(params.locale);
  return {
    title: t("preferences"),
  };
}
