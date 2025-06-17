// "use client";

// import { Badge } from "@/components/ui/badge";
// import { Button } from "@/components/ui/button";
// import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { getSimplifiedModelAvailability } from "@/lib/providers";
// import type { SimpleModelAvailability } from "@/types/providers";
// import { useUser } from "@clerk/nextjs";
// import { useQuery } from "convex/react";
// import {
//   ExternalLink,
//   Info,
//   Settings,
//   Shield,
//   Zap
// } from "lucide-react";
// import Link from "next/link";
// import { useState } from "react";
// import { api } from "../../../convex/_generated/api";

// interface ModelSelectorEnhancedProps {
//   value: string;
//   onValueChange: (value: string) => void;
//   className?: string;
// }

// export function ModelSelectorEnhanced({ 
//   value, 
//   onValueChange, 
//   className 
// }: ModelSelectorEnhancedProps) {
//   const { user } = useUser();
//   const [showInfo, setShowInfo] = useState(false);
  
//   // Get user configuration
//   const configuration = useQuery(
//     api.userApiKeys.getMyConfiguration,
//     user ? {} : "skip"
//   );

//   // Get available models
//   const availableModels = getSimplifiedModelAvailability(
//     configuration?.apiKeys || null,
//     configuration?.preferences || null
//   );

//   const selectedModel = availableModels.find(m => m.modelId === value);
  
//   const getSourceIcon = (source: SimpleModelAvailability['source']) => {
//     switch (source) {
//       case 'provider':
//         return <Shield className="h-3 w-3 text-green-600" />;
//       case 'openrouter':
//         return <Zap className="h-3 w-3 text-blue-600" />;
//       case 'system':
//         return <Settings className="h-3 w-3 text-gray-600" />;
//       default:
//         return null;
//     }
//   };

//   const getSourceBadge = (source: SimpleModelAvailability['source']) => {
//     switch (source) {
//       case 'provider':
//         return <Badge variant="outline" className="text-xs text-green-600">Direct</Badge>;
//       case 'openrouter':
//         return <Badge variant="outline" className="text-xs text-blue-600">OpenRouter</Badge>;
//       case 'system':
//         return <Badge variant="outline" className="text-xs text-gray-600">System</Badge>;
//       default:
//         return null;
//     }
//   };

//   const getConfigurationStatus = () => {
//     if (!user) return "Guest Mode";
//     if (!configuration) return "Loading...";
    
//     // Determine configuration based on available keys and preferences
//     const hasDirectKeys = !!(
//       configuration.apiKeys?.openaiKey || 
//       configuration.apiKeys?.anthropicKey || 
//       configuration.apiKeys?.googleKey
//     );
//     const hasOpenRouterKey = !!configuration.apiKeys?.openrouterKey;
//     const useDirectProviders = Object.values(configuration.preferences?.defaultProviders || {}).some(Boolean);
    
//     if (hasDirectKeys && useDirectProviders && hasOpenRouterKey) {
//       return "Mixed Keys";
//     } else if (hasDirectKeys && useDirectProviders) {
//       return "Direct Keys Only";
//     } else if (hasOpenRouterKey) {
//       return "OpenRouter Key";
//     } else {
//       return "System Default";
//     }
//   };

//   const availableCount = availableModels.filter(m => m.available).length;
//   const totalCount = availableModels.length;

//   return (
//     <div className={`flex items-center gap-2 ${className}`}>
//       {/* Model Selector */}
//       <Select value={value} onValueChange={onValueChange}>
//         <SelectTrigger className="min-w-[200px]">
//           <div className="flex items-center gap-2 flex-1">
//             {selectedModel && getSourceIcon(selectedModel.source)}
//             <SelectValue placeholder="Choose model" />
//           </div>
//         </SelectTrigger>
//         <SelectContent className="max-w-[400px]">
//           {/* Available Models */}
//           <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
//             Available Models ({availableCount})
//           </div>
//           {availableModels
//             .filter(m => m.available)
//             .map((model) => (
//               <SelectItem key={model.modelId} value={model.modelId}>
//                 <div className="flex items-center justify-between w-full">
//                   <div className="flex items-center gap-2">
//                     {getSourceIcon(model.source)}
//                     <span className="font-medium">{model.name}</span>
//                   </div>
//                   <div className="flex items-center gap-1">
//                     <Badge variant="outline" className="text-xs">
//                       {model.modelData.cost}
//                     </Badge>
//                     <Badge variant="outline" className="text-xs">
//                       {model.modelData.speed}
//                     </Badge>
//                     {model.modelData.supportVision && (
//                       <Badge variant="outline" className="text-xs">Vision</Badge>
//                     )}
//                   </div>
//                 </div>
//               </SelectItem>
//             ))}
          
//           {/* Unavailable Models */}
//           {availableModels.some(m => !m.available) && (
//             <>
//               <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium border-t mt-1 pt-2">
//                 Unavailable Models ({totalCount - availableCount})
//               </div>
//               {availableModels
//                 .filter(m => !m.available)
//                 .map((model) => (
//                   <SelectItem 
//                     key={model.modelId} 
//                     value={model.modelId}
//                     disabled
//                     className="opacity-50"
//                   >
//                     <div className="flex items-center justify-between w-full">
//                       <span>{model.name}</span>
//                       <Badge variant="secondary" className="text-xs">
//                         Needs Setup
//                       </Badge>
//                     </div>
//                   </SelectItem>
//                 ))}
              
//               <div className="px-2 py-1.5 border-t mt-1">
//                 <Link href="/settings">
//                   <Button variant="outline" size="sm" className="w-full text-xs">
//                     <Settings className="h-3 w-3 mr-1" />
//                     Configure API Keys
//                   </Button>
//                 </Link>
//               </div>
//             </>
//           )}
//         </SelectContent>
//       </Select>

//       {/* Model Information Popover */}
//       <Popover open={showInfo} onOpenChange={setShowInfo}>
//         <PopoverTrigger asChild>
//           <Button variant="outline" size="sm" className="p-2">
//             <Info className="h-4 w-4" />
//           </Button>
//         </PopoverTrigger>
//         <PopoverContent className="w-80" side="bottom" align="end">
//           <div className="space-y-4">
//             {/* Current Model Info */}
//             {selectedModel && (
//               <div>
//                 <h4 className="font-semibold text-sm mb-2">Current Model</h4>
//                 <div className="space-y-2">
//                   <div className="flex items-center justify-between">
//                     <span className="text-sm">{selectedModel.name}</span>
//                     {getSourceBadge(selectedModel.currentSource)}
//                   </div>
//                   <div className="grid grid-cols-2 gap-2 text-xs">
//                     <div>
//                       <span className="text-muted-foreground">Provider:</span>
//                       <br />
//                       <span>{selectedModel.modelData.provider}</span>
//                     </div>
//                     <div>
//                       <span className="text-muted-foreground">Cost:</span>
//                       <br />
//                       <span>{selectedModel.modelData.cost}</span>
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Configuration Status */}
//             <div className="border-t pt-3">
//               <h4 className="font-semibold text-sm mb-2">Configuration</h4>
//               <div className="space-y-2">
//                 <div className="flex items-center justify-between text-sm">
//                   <span>Status:</span>
//                   <span className="font-medium">{getConfigurationStatus()}</span>
//                 </div>
//                 <div className="flex items-center justify-between text-sm">
//                   <span>Available:</span>
//                   <span>{availableCount} / {totalCount} models</span>
//                 </div>
//               </div>
//             </div>

//             {/* Actions */}
//             <div className="border-t pt-3 space-y-2">
//               <Link href="/settings">
//                 <Button variant="outline" size="sm" className="w-full text-xs">
//                   <Settings className="h-3 w-3 mr-1" />
//                   Manage API Keys
//                 </Button>
//               </Link>
              
//               {selectedModel && (
//                 <a 
//                   href={`https://docs.${selectedModel.modelData.provider.toLowerCase()}.com`}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="block"
//                 >
//                   <Button variant="ghost" size="sm" className="w-full text-xs">
//                     <ExternalLink className="h-3 w-3 mr-1" />
//                     Model Documentation
//                   </Button>
//                 </a>
//               )}
//             </div>
//           </div>
//         </PopoverContent>
//       </Popover>

//       {/* Quick Status Indicator */}
//       <div className="flex items-center gap-1">
//         {selectedModel && getSourceIcon(selectedModel.currentSource)}
//         <span className="text-xs text-muted-foreground">
//           {availableCount}/{totalCount}
//         </span>
//       </div>
//     </div>
//   );
// } 