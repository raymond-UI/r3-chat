export type PageParams = {
    params: Promise<{
      id: string;
      shareId: string;
      username: string;
      page?: string;
      tag?: string;
      featured?: string;
    }>;
  };