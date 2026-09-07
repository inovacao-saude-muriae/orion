import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// ═══════════════════════════════════════════════════════════════════════════
// MAPEAMENTO DE PERMISSÕES POR MÓDULO E CARGO
// ═══════════════════════════════════════════════════════════════════════════

const PERMISSOES_ROTAS = {
  // ─────────────────────────────────────────────────────────────────────────
  // REGULAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  "/regulacao": [
    "GESTOR",           // Gestor acessa tudo
    "REGULACAO_ADMIN",  // Admin da Regulação acessa tudo
    "REGULACAO_COMUM"   // Comum acessa regulação (exceto financeiro)
  ],
  
  // REGULAÇÃO - FINANCEIRO (Apenas Admin e Gestor)
  "/regulacao/financeiro": [
    "GESTOR",
    "REGULACAO_ADMIN"   // Comum NÃO tem acesso
  ],
  
  // ─────────────────────────────────────────────────────────────────────────
  // CÂMARA TÉCNICA - FARMÁCIA JUDICIAL
  // ─────────────────────────────────────────────────────────────────────────
  "/camara-tecnica/farmacia": [
    "GESTOR",
    "FARMACIA_ADMIN"    // Apenas admin da farmácia
  ],
  
  // ─────────────────────────────────────────────────────────────────────────
  // CÂMARA TÉCNICA - PROCESSOS
  // ─────────────────────────────────────────────────────────────────────────
  "/camara-tecnica/processos": [
    "GESTOR",
    "PROCESSO_ADMIN"    // Apenas admin de processos
  ],
  
  // ─────────────────────────────────────────────────────────────────────────
  // JUNTA REGULADORA
  // ─────────────────────────────────────────────────────────────────────────
  "/junta-reguladora": [
    "GESTOR",
    "JUNTA_ADMIN",      // Admin acessa tudo da junta
    "JUNTA_CAEE",       // Acessa apenas se for seu serviço
    "JUNTA_EDUCACAO",
    "JUNTA_SAUDE",
    "JUNTA_ASSISTENCIA"
  ],
  
  // JUNTA REGULADORA - SERVIÇOS ESPECÍFICOS
  "/junta-reguladora/caee": [
    "GESTOR",
    "JUNTA_ADMIN",
    "JUNTA_CAEE"        // Apenas CAEE
  ],
  
  "/junta-reguladora/educacao": [
    "GESTOR",
    "JUNTA_ADMIN",
    "JUNTA_EDUCACAO"    // Apenas Educação
  ],
  
  "/junta-reguladora/saude": [
    "GESTOR",
    "JUNTA_ADMIN",
    "JUNTA_SAUDE"       // Apenas Saúde
  ],
  
  "/junta-reguladora/assistencia": [
    "GESTOR",
    "JUNTA_ADMIN",
    "JUNTA_ASSISTENCIA" // Apenas Assistência
  ],
  
  // ─────────────────────────────────────────────────────────────────────────
  // CCZ (Centro de Controle de Zoonoses)
  // ─────────────────────────────────────────────────────────────────────────
  "/ccz": [
    "GESTOR",
    "CCZ_ADMIN"         // Apenas admin do CCZ
  ],
  
  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD - Todos os usuários autenticados
  // ─────────────────────────────────────────────────────────────────────────
  "/dashboard": [
    "GESTOR",
    "REGULACAO_ADMIN",
    "REGULACAO_COMUM",
    "FARMACIA_ADMIN",
    "PROCESSO_ADMIN",
    "JUNTA_ADMIN",
    "JUNTA_CAEE",
    "JUNTA_EDUCACAO",
    "JUNTA_SAUDE",
    "JUNTA_ASSISTENCIA",
    "CCZ_ADMIN"
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// MIDDLEWARE DE AUTENTICAÇÃO E AUTORIZAÇÃO
// ═══════════════════════════════════════════════════════════════════════════

export async function middleware(request) {
  const token = request.cookies.get("session_token")?.value;
  const { pathname } = request.nextUrl;

  // ─────────────────────────────────────────────────────────────────────────
  // ROTAS PÚBLICAS (sem autenticação)
  // ─────────────────────────────────────────────────────────────────────────
  if (
    pathname.startsWith("/login") || 
    pathname.startsWith("/_next") || 
    pathname.startsWith("/api") ||
    pathname === "/acesso-negado"
  ) {
    return NextResponse.next();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDAÇÃO DE AUTENTICAÇÃO
  // ─────────────────────────────────────────────────────────────────────────
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VALIDAÇÃO DO TOKEN JWT E PERMISSÕES
  // ─────────────────────────────────────────────────────────────────────────
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    const userRole = payload.role;
    if (pathname === "/regulacao" && request.nextUrl.searchParams.get("tab") === "FINANCEIRO" && !["GESTOR", "REGULACAO_ADMIN"].includes(userRole)) {
      return NextResponse.redirect(new URL("/acesso-negado", request.url));
    }
    const userId = payload.userId;
    const userName = payload.nome || 'Usuário';

    // Adiciona informações do usuário aos headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);
    requestHeaders.set('x-user-role', userRole);
    requestHeaders.set('x-user-name', userName);

    // ───────────────────────────────────────────────────────────────────────
    // VERIFICAÇÃO DE PERMISSÕES POR ROTA
    // ───────────────────────────────────────────────────────────────────────
    
    // GESTOR tem acesso a tudo
    if (userRole === 'GESTOR') {
      console.log(`✅ [Middleware] Gestor ${userId} acessou ${pathname}`);
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Verifica permissões específicas por rota
    let acessoPermitido = false;
    let rotaEncontrada = false;

    // Ordenar rotas por especificidade (mais específica primeiro)
    const rotasOrdenadas = Object.entries(PERMISSOES_ROTAS)
      .sort(([a], [b]) => b.length - a.length);

    for (const [rota, rolesPermitidas] of rotasOrdenadas) {
      if (pathname.startsWith(rota)) {
        rotaEncontrada = true;
        
        if (rolesPermitidas.includes(userRole)) {
          acessoPermitido = true;
          console.log(`✅ [Middleware] ${userRole} ${userId} acessou ${pathname}`);
          break;
        } else {
          acessoPermitido = false;
          console.warn(`⛔ [Middleware] ACESSO NEGADO: ${userRole} ${userId} tentou acessar ${pathname}`);
          break;
        }
      }
    }

    // Se não encontrou rota específica, permite (rotas sem restrição)
    if (!rotaEncontrada) {
      console.log(`ℹ️  [Middleware] Rota sem restrição: ${pathname}`);
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }

    // Se acesso não foi permitido, redireciona para página de acesso negado
    if (!acessoPermitido) {
      const acessoNegadoUrl = new URL("/acesso-negado", request.url);
      acessoNegadoUrl.searchParams.set("rota", pathname);
      acessoNegadoUrl.searchParams.set("role", userRole);
      return NextResponse.redirect(acessoNegadoUrl);
    }

    // Acesso permitido
    return NextResponse.next({
      request: { headers: requestHeaders },
    });

  } catch (error) {
    console.error("[Middleware] Erro ao verificar token:", error.message);
    
    // Token inválido ou expirado - redireciona para login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    loginUrl.searchParams.set("error", "session_expired");
    
    // Limpa o cookie inválido
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("session_token");
    
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|img).*)"],
};
