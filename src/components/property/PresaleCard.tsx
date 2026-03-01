import Link from "next/link";
import { Building2, MapPin, Calendar, ArrowRight } from "lucide-react";

export interface PresaleProject {
    id: string;
    name: string;
    area: string;
    completionYear: string;
    priceRange: string;
    imageUrl: string;
    hasJapaneseSupport: boolean;
    slug: string;
}

interface PresaleCardProps {
    project: PresaleProject;
}

export default function PresaleCard({ project }: PresaleCardProps) {
    return (
        <Link href={`/presale/${project.slug}`} className="group block h-full">
            <div className="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col h-full group-hover:-translate-y-1">
                {/* Image Section */}
                <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                        src={project.imageUrl}
                        alt={project.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Badges */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">
                            プレセール
                        </span>
                        {project.hasJapaneseSupport && (
                            <span className="bg-navy-primary/90 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shrink-0">
                                日本人窓口あり
                            </span>
                        )}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 text-white">
                        <h3 className="text-xl font-bold mb-1 truncate">{project.name}</h3>
                        <div className="flex items-center text-sm font-medium opacity-90">
                            <MapPin className="w-3.5 h-3.5 mr-1" />
                            {project.area}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                <div className="p-5 flex flex-col flex-grow">
                    <div className="space-y-3 mb-4 flex-grow">
                        <div className="flex items-center text-gray-600 text-sm">
                            <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                            竣工予定: <span className="font-semibold ml-1 text-gray-900">{project.completionYear}</span>
                        </div>
                        <div className="flex items-center text-gray-600 text-sm">
                            <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                            価格帯: <span className="font-bold ml-1 text-rose-600 text-base">{project.priceRange}</span>
                        </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between text-navy-primary font-bold text-sm">
                        <span>プロジェクト詳細を見る</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                </div>
            </div>
        </Link>
    );
}
