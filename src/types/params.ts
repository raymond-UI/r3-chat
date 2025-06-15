export type PageParams = {
    params: Promise<{
      id: string;
      slug: string;
      shareId: string;
      username: string;
      page?: string;
      tag?: string;
      featured?: string;
      invite?: string;
    }>;
  };