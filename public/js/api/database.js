async function fetchDataByTypes(types = ["products"]) {
  const { data, error } = await client
    .from("information")
    .select(
      `
            *,
            categories!information_category_id_fkey!inner(type)
        `,
    )
    .in("categories.type", types);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(({ categories, ...info }) => ({
    ...info,
    type: categories?.type ?? null,
  }));
}

async function fetchDataById(id) {
  const { data, error } = await client
    .from("information")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data;
}

async function subscribe(email) {
  const { error } = await client.from("subscriptions").insert({ email });
  if (error) throw error;
}

async function fetchTestimonials() {
  const { data, error } = await client.from("testimonials").select(`
            *,
            user:users!testimonials_author_id_fkey(*)
        `);

  if (error) {
    console.error(error);
    return [];
  }

  return (data ?? []).map(({ user, ...info }) => ({
    ...info,
    name: user?.name ?? "Anonymous",
    email: user?.email ?? null,
  }));
}

async function fetchCategoriesByType(type = "gallery") {
  const { data, error } = await client
    .from("categories")
    .select()
    .eq("type", type);

  if (error) {
    console.error(error);
    return [];
  }

  return data;
}

async function fetchGallery() {
  return fetchDataByTypes(["gallery"]);
}

async function fetchBlogsByCategoryId(
  keyword = "",
  categoryId = "All",
  page = 1,
  pageSize = 2,
) {
  const safeCategoryId = Number(categoryId);
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.max(1, Number(pageSize) || 2);

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  let query = client
    .from("information")
    .select(
      `
      id,
      title,
      category_id,
      author_id,
      thumbpath,
      summary,
      created_at,
      author:users!information_author_id_fkey(id, name),
      category:categories!information_category_id_fkey!inner(id, name, type)
      `,
      { count: "exact" },
    )
    .eq("category.type", "blogs")
    .order("created_at", { ascending: false });

  if (!Number.isNaN(safeCategoryId) && safeCategoryId > 0) {
    query = query.eq("category_id", safeCategoryId);
  }

  const textSearch = (keyword || "").trim();
  if (textSearch) {
    query = query.or(
      `title.ilike.%${textSearch}%,summary.ilike.%${textSearch}%,description.ilike.%${textSearch}%`,
    );
  }

  const { data, error, count } = await query.range(from, to);
  const totalItems = count ?? 0;
  const pageCount = Math.ceil(totalItems / safePageSize);
  const prevPage = Math.max(1, safePage - 1);
  const nextPage = Math.min(pageCount, safePage + 1);

  if (error) {
    console.error(error);

    return {
      data: [],
      pagination: {
        currentPage: safePage,
        pageCount: 0,
        category: categoryId,
        size: safePageSize,
        prevPage,
        nextPage,
        keyword,
      },
      error,
    };
  }

  return {
    data,

    pagination: {
      currentPage: safePage,
      pageCount,
      category: categoryId,
      size: safePageSize,
      prevPage,
      nextPage,
      keyword,
    },

    error,
  };
}

async function fetchBlogById(id) {
  const { data, error } = await client
    .from("information")
    .select(
      `
      id,
      title,
      category_id,
      author_id,
      imagepath,
      description,
      created_at,
      author:users!information_author_id_fkey(id, name),
      category:categories!information_category_id_fkey!inner(id, name),
      comments:comments(
        id,
        message,
        created_at,
        author:users(id, name)
      )
    `,
    )
    .eq("id", id)
    .order("created_at", {
      ascending: false,
      referencedTable: "comments",
    })
    .single();

  if (error) {
    console.error("Error fetching blog details", error);
    return null;
  }

  return data;
}

async function sendMessage(name, email, subject, message) {
  const { error } = await client
    .from("contacts")
    .insert({ email, name, subject, message });

  if (error) throw error; // Sửa 'errow' thành 'error'
}

async function fetchDataByKeyword(keyword) {
  const textSearch = (keyword || "").trim();
  const excluded = [31, 32, 33, 34];

  let query = client
    .from("information")
    .select(
      `
        id,
        title,
        summary,
        thumbpath
    `,
    )
    .not("category_id", "in", `(${excluded.join(",")})`);

  if (textSearch) {
    query = query.or(
      `title.ilike.%${textSearch}%,summary.ilike.%${textSearch}%,description.ilike.%${textSearch}%`,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error searching data", error);
    return [];
  }

  return data;
}

async function updateUserProfile(id, name) {
  const { error } = await client.from("users").update({ name }).eq("id", id);
  if (error) throw error;
}

async function supabaseSignup(email, password, name) {
  const { data, error } = await client.auth.signUp({
    email,
    password,
  });

  if (error) throw error;

  const user = data?.user;
  if (!user) throw new Error("No user returned");

  const { error: insertError } = await client.from("users").insert({
    id: user.id,
    name,
    email,
  });

  if (insertError) throw insertError;

  return user;
}

async function initAuthUI(session) {
  const isLogin = Boolean(session?.user);

  document
    .querySelectorAll(".isLogout")
    .forEach((item) => item.classList.toggle("hidden", isLogin));
  document
    .querySelectorAll(".isLogin")
    .forEach((item) => item.classList.toggle("hidden", !isLogin));

  const { id, email } = session.user;
  const profile = await fetchUserProfile(id);
  document.querySelector("#crud-modal #email").value = email;
  document.querySelector("#crud-modal #name").value = profile?.name;
  document.querySelector("#crud-modal #id").value = id;
}

async function fetchUserProfile(id) {
  const { data, error } = await client
    .from("users")
    .select("*") // test toàn bộ field
    .eq("id", id)
    .single();

  console.log("DEBUG PROFILE:", data, error);

  if (error) return null;
  return data;
}

async function supabaseLogout() {
  const { error } = await client.auth.signOut();
  if (error) throw error;
}

async function supabaseLogin(email, password) {
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}
