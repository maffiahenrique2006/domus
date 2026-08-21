import { lazy, type ComponentType } from 'react';
import {
  ColorsPage,
  FontsPage,
  LayoutPage,
  OverviewPage,
} from './foundations';

function lazyPage(load: () => Promise<ComponentType>) {
  return lazy(async () => ({ default: await load() }));
}

const AccordionDemo = lazyPage(() =>
  import('./demos/accordion').then(({ AccordionDemo }) => AccordionDemo),
);
const AlertDemo = lazyPage(() =>
  import('./demos/alert').then(({ AlertDemo }) => AlertDemo),
);
const AlertDialogDemo = lazyPage(() =>
  import('./demos/alert-dialog').then(({ AlertDialogDemo }) => AlertDialogDemo),
);
const AspectRatioDemo = lazyPage(() =>
  import('./demos/aspect-ratio').then(({ AspectRatioDemo }) => AspectRatioDemo),
);
const AvatarDemo = lazyPage(() =>
  import('./demos/avatar').then(({ AvatarDemo }) => AvatarDemo),
);
const BadgeDemo = lazyPage(() =>
  import('./demos/badge').then(({ BadgeDemo }) => BadgeDemo),
);
const BreadcrumbDemo = lazyPage(() =>
  import('./demos/breadcrumb').then(({ BreadcrumbDemo }) => BreadcrumbDemo),
);
const ButtonDemo = lazyPage(() =>
  import('./demos/button').then(({ ButtonDemo }) => ButtonDemo),
);
const ButtonGroupDemo = lazyPage(() =>
  import('./demos/button-group').then(({ ButtonGroupDemo }) => ButtonGroupDemo),
);
const CalendarDemo = lazyPage(() =>
  import('./demos/calendar').then(({ CalendarDemo }) => CalendarDemo),
);
const CardDemo = lazyPage(() =>
  import('./demos/card').then(({ CardDemo }) => CardDemo),
);
const CarouselDemo = lazyPage(() =>
  import('./demos/carousel').then(({ CarouselDemo }) => CarouselDemo),
);
const ChartDemo = lazyPage(() =>
  import('./demos/chart').then(({ ChartDemo }) => ChartDemo),
);
const CheckboxDemo = lazyPage(() =>
  import('./demos/checkbox').then(({ CheckboxDemo }) => CheckboxDemo),
);
const CollapsibleDemo = lazyPage(() =>
  import('./demos/collapsible').then(({ CollapsibleDemo }) => CollapsibleDemo),
);
const CommandDemo = lazyPage(() =>
  import('./demos/command').then(({ CommandDemo }) => CommandDemo),
);
const ContextMenuDemo = lazyPage(() =>
  import('./demos/context-menu').then(({ ContextMenuDemo }) => ContextMenuDemo),
);
const DialogDemo = lazyPage(() =>
  import('./demos/dialog').then(({ DialogDemo }) => DialogDemo),
);
const DrawerDemo = lazyPage(() =>
  import('./demos/drawer').then(({ DrawerDemo }) => DrawerDemo),
);
const DropdownMenuDemo = lazyPage(() =>
  import('./demos/dropdown-menu').then(
    ({ DropdownMenuDemo }) => DropdownMenuDemo,
  ),
);
const EmptyDemo = lazyPage(() =>
  import('./demos/empty').then(({ EmptyDemo }) => EmptyDemo),
);
const FieldDemo = lazyPage(() =>
  import('./demos/field').then(({ FieldDemo }) => FieldDemo),
);
const FormDemo = lazyPage(() =>
  import('./demos/form').then(({ FormDemo }) => FormDemo),
);
const HoverCardDemo = lazyPage(() =>
  import('./demos/hover-card').then(({ HoverCardDemo }) => HoverCardDemo),
);
const InputDemo = lazyPage(() =>
  import('./demos/input').then(({ InputDemo }) => InputDemo),
);
const InputGroupDemo = lazyPage(() =>
  import('./demos/input-group').then(({ InputGroupDemo }) => InputGroupDemo),
);
const InputOtpDemo = lazyPage(() =>
  import('./demos/input-otp').then(({ InputOtpDemo }) => InputOtpDemo),
);
const ItemDemo = lazyPage(() =>
  import('./demos/item').then(({ ItemDemo }) => ItemDemo),
);
const KbdDemo = lazyPage(() =>
  import('./demos/kbd').then(({ KbdDemo }) => KbdDemo),
);
const MenubarDemo = lazyPage(() =>
  import('./demos/menubar').then(({ MenubarDemo }) => MenubarDemo),
);
const NavigationMenuDemo = lazyPage(() =>
  import('./demos/navigation-menu').then(
    ({ NavigationMenuDemo }) => NavigationMenuDemo,
  ),
);
const PaginationDemo = lazyPage(() =>
  import('./demos/pagination').then(({ PaginationDemo }) => PaginationDemo),
);
const PopoverDemo = lazyPage(() =>
  import('./demos/popover').then(({ PopoverDemo }) => PopoverDemo),
);
const ProgressDemo = lazyPage(() =>
  import('./demos/progress').then(({ ProgressDemo }) => ProgressDemo),
);
const RadioGroupDemo = lazyPage(() =>
  import('./demos/radio-group').then(({ RadioGroupDemo }) => RadioGroupDemo),
);
const ResizableDemo = lazyPage(() =>
  import('./demos/resizable').then(({ ResizableDemo }) => ResizableDemo),
);
const ScrollAreaDemo = lazyPage(() =>
  import('./demos/scroll-area').then(({ ScrollAreaDemo }) => ScrollAreaDemo),
);
const SelectDemo = lazyPage(() =>
  import('./demos/select').then(({ SelectDemo }) => SelectDemo),
);
const SeparatorDemo = lazyPage(() =>
  import('./demos/separator').then(({ SeparatorDemo }) => SeparatorDemo),
);
const SheetDemo = lazyPage(() =>
  import('./demos/sheet').then(({ SheetDemo }) => SheetDemo),
);
const SidebarDemo = lazyPage(() =>
  import('./demos/sidebar').then(({ SidebarDemo }) => SidebarDemo),
);
const SkeletonDemo = lazyPage(() =>
  import('./demos/skeleton').then(({ SkeletonDemo }) => SkeletonDemo),
);
const SliderDemo = lazyPage(() =>
  import('./demos/slider').then(({ SliderDemo }) => SliderDemo),
);
const SonnerDemo = lazyPage(() =>
  import('./demos/sonner').then(({ SonnerDemo }) => SonnerDemo),
);
const SpinnerDemo = lazyPage(() =>
  import('./demos/spinner').then(({ SpinnerDemo }) => SpinnerDemo),
);
const SwitchDemo = lazyPage(() =>
  import('./demos/switch').then(({ SwitchDemo }) => SwitchDemo),
);
const TableDemo = lazyPage(() =>
  import('./demos/table').then(({ TableDemo }) => TableDemo),
);
const TabsDemo = lazyPage(() =>
  import('./demos/tabs').then(({ TabsDemo }) => TabsDemo),
);
const TextareaDemo = lazyPage(() =>
  import('./demos/textarea').then(({ TextareaDemo }) => TextareaDemo),
);
const ToastDemo = lazyPage(() =>
  import('./demos/toast').then(({ ToastDemo }) => ToastDemo),
);
const ToggleDemo = lazyPage(() =>
  import('./demos/toggle').then(({ ToggleDemo }) => ToggleDemo),
);
const ToggleGroupDemo = lazyPage(() =>
  import('./demos/toggle-group').then(({ ToggleGroupDemo }) => ToggleGroupDemo),
);
const TooltipDemo = lazyPage(() =>
  import('./demos/tooltip').then(({ TooltipDemo }) => TooltipDemo),
);

export type PreviewEntry = {
  // Globally unique across every group — it is the deep-link slug (`#page=<id>`)
  // and the active-page key. Group-qualify names that repeat across groups
  // (e.g. `brand-icons` vs `components-icons`).
  id: string;
  name: string;
  description: string;
  Page: ComponentType;
};

export type NavGroup = {
  name: string;
  entries: PreviewEntry[];
};

export const DESIGN_SYSTEM = {
  title: 'Domus Design System',
  description:
    'Linguagem visual do Domus — paleta ink escura, azul de ação, ciano como luz da marca, Inter + IBM Plex Mono.',
} as const;

export const OVERVIEW_ENTRY: PreviewEntry = {
  id: 'overview',
  name: 'Visão geral',
  description: 'Fundamentos visuais e princípios que guiam o sistema.',
  Page: OverviewPage,
};

export const NAV_GROUPS: NavGroup[] = [
  {
    name: 'Cores',
    entries: [
      {
        id: 'color-roles',
        name: 'Paleta e papéis',
        description: 'Primitivos ink/azul/ciano, papéis semânticos, estados e áreas de negócio.',
        Page: ColorsPage,
      },
    ],
  },
  {
    name: 'Tipografia',
    entries: [
      {
        id: 'type-scale',
        name: 'Escala tipográfica',
        description: 'Inter para interface, IBM Plex Mono para dados e código.',
        Page: FontsPage,
      },
    ],
  },
  {
    name: 'Layout',
    entries: [
      {
        id: 'spacing-radius',
        name: 'Espaçamento e raios',
        description: 'Grade de 4px e tratamentos de canto do sistema.',
        Page: LayoutPage,
      },
    ],
  },
  {
    name: 'Ações',
    entries: [
      { id: 'button',       name: 'Botões',          description: 'Variantes, tamanhos, ícones e estados.',             Page: ButtonDemo },
      { id: 'button-group', name: 'Grupo de botões', description: 'Ações agrupadas com separadores.',                   Page: ButtonGroupDemo },
      { id: 'toggle',       name: 'Toggle',          description: 'Controles pressionados em variantes e tamanhos.',     Page: ToggleDemo },
      { id: 'toggle-group', name: 'Grupo de toggle', description: 'Seleção única e múltipla.',                          Page: ToggleGroupDemo },
    ],
  },
  {
    name: 'Formulários',
    entries: [
      { id: 'input',       name: 'Campo de texto',  description: 'Texto, e-mail, arquivo e estados de validação.',      Page: InputDemo },
      { id: 'input-group', name: 'Campo com addon', description: 'Campos com prefixo e sufixo.',                        Page: InputGroupDemo },
      { id: 'input-otp',   name: 'OTP',             description: 'Entrada segmentada de código de verificação.',        Page: InputOtpDemo },
      { id: 'textarea',    name: 'Textarea',         description: 'Texto multilinha e estados.',                         Page: TextareaDemo },
      { id: 'checkbox',    name: 'Checkbox',         description: 'Marcado, desmarcado e desabilitado.',                 Page: CheckboxDemo },
      { id: 'radio-group', name: 'Radio group',      description: 'Escolhas exclusivas com rótulos e estados.',          Page: RadioGroupDemo },
      { id: 'select',      name: 'Select',           description: 'Opções agrupadas e estados desabilitados.',           Page: SelectDemo },
      { id: 'slider',      name: 'Slider',           description: 'Valores únicos, intervalos e estados.',               Page: SliderDemo },
      { id: 'switch',      name: 'Switch',           description: 'Controles binários de preferência.',                  Page: SwitchDemo },
      { id: 'calendar',    name: 'Calendário',       description: 'Calendário determinístico de data única.',            Page: CalendarDemo },
      { id: 'field',       name: 'Campo',            description: 'Rótulos, descrições, erros e campos agrupados.',      Page: FieldDemo },
      { id: 'form',        name: 'Formulário',       description: 'Composição validada com rótulos e mensagens.',        Page: FormDemo },
    ],
  },
  {
    name: 'Sobreposições',
    entries: [
      { id: 'dialog',       name: 'Dialog',       description: 'Conteúdo modal com cabeçalho, rodapé e ações.',         Page: DialogDemo },
      { id: 'alert-dialog', name: 'Alert dialog', description: 'Confirmação para ações consequentes.',                  Page: AlertDialogDemo },
      { id: 'sheet',        name: 'Sheet',        description: 'Painéis de sobreposição alinhados à borda.',            Page: SheetDemo },
      { id: 'drawer',       name: 'Drawer',       description: 'Conteúdo inferior amigável ao toque.',                  Page: DrawerDemo },
      { id: 'popover',      name: 'Popover',      description: 'Conteúdo interativo ancorado.',                         Page: PopoverDemo },
      { id: 'hover-card',   name: 'Hover card',   description: 'Contexto rico revelado no hover.',                      Page: HoverCardDemo },
      { id: 'tooltip',      name: 'Tooltip',      description: 'Rótulos breves para controles focados ou em hover.',    Page: TooltipDemo },
      { id: 'command',      name: 'Command',      description: 'Listas de comandos com busca e teclado.',               Page: CommandDemo },
    ],
  },
  {
    name: 'Navegação',
    entries: [
      { id: 'dropdown-menu',    name: 'Menu dropdown',    description: 'Ações, atalhos e submenus.',                     Page: DropdownMenuDemo },
      { id: 'context-menu',     name: 'Menu de contexto', description: 'Ações ao clicar com o botão direito.',           Page: ContextMenuDemo },
      { id: 'menubar',          name: 'Barra de menus',   description: 'Menus de aplicação estilo desktop.',             Page: MenubarDemo },
      { id: 'navigation-menu',  name: 'Menu de navegação',description: 'Navegação primária com painéis ricos.',          Page: NavigationMenuDemo },
      { id: 'breadcrumb',       name: 'Breadcrumb',       description: 'Localização hierárquica e links de pai.',        Page: BreadcrumbDemo },
      { id: 'pagination',       name: 'Paginação',        description: 'Anterior, próximo, página e overflow.',          Page: PaginationDemo },
      { id: 'tabs',             name: 'Abas',             description: 'Alterna entre visualizações relacionadas.',      Page: TabsDemo },
      { id: 'sidebar',          name: 'Sidebar',          description: 'Navegação e layout de aplicação com limites.',   Page: SidebarDemo },
    ],
  },
  {
    name: 'Dados',
    entries: [
      { id: 'avatar',       name: 'Avatar',          description: 'Imagens de perfil, fallbacks e tamanhos.',            Page: AvatarDemo },
      { id: 'badge',        name: 'Badge',            description: 'Rótulos compactos de status e categoria.',           Page: BadgeDemo },
      { id: 'card',         name: 'Card',             description: 'Conteúdo agrupado com cabeçalho, corpo e rodapé.',   Page: CardDemo },
      { id: 'table',        name: 'Tabela',           description: 'Dados tabulares estruturados e resumos.',            Page: TableDemo },
      { id: 'accordion',    name: 'Acordeão',         description: 'Seções expansíveis para divulgação progressiva.',    Page: AccordionDemo },
      { id: 'collapsible',  name: 'Collapsible',      description: 'Região de conteúdo retrátil compacta.',              Page: CollapsibleDemo },
      { id: 'carousel',     name: 'Carrossel',        description: 'Conteúdo paginado acessível por teclado.',           Page: CarouselDemo },
      { id: 'item',         name: 'Item',             description: 'Linhas flexíveis com mídia, metadados e ações.',     Page: ItemDemo },
      { id: 'empty',        name: 'Estado vazio',     description: 'Orientação e ações quando o conteúdo está ausente.', Page: EmptyDemo },
      { id: 'kbd',          name: 'Tecla',            description: 'Atalhos de teclado individuais e agrupados.',        Page: KbdDemo },
      { id: 'aspect-ratio', name: 'Proporção',        description: 'Contêineres de mídia proporcionais responsivos.',   Page: AspectRatioDemo },
    ],
  },
  {
    name: 'Feedback',
    entries: [
      { id: 'alert',    name: 'Alert',    description: 'Mensagens informativas e de erro.',                              Page: AlertDemo },
      { id: 'progress', name: 'Progresso',description: 'Indicadores de conclusão para trabalho em andamento.',          Page: ProgressDemo },
      { id: 'skeleton', name: 'Skeleton', description: 'Formas de placeholder para conteúdo carregando.',               Page: SkeletonDemo },
      { id: 'spinner',  name: 'Spinner',  description: 'Indicadores de carregamento indeterminado.',                    Page: SpinnerDemo },
      { id: 'toast',    name: 'Toast',    description: 'Notificações transitórias com ações.',                          Page: ToastDemo },
      { id: 'sonner',   name: 'Sonner',   description: 'Notificações empilhadas com status e ações.',                   Page: SonnerDemo },
    ],
  },
  {
    name: 'Estrutura',
    entries: [
      { id: 'separator',  name: 'Separador',              description: 'Divisores visuais horizontais e verticais.',    Page: SeparatorDemo },
      { id: 'scroll-area',name: 'Área de rolagem',        description: 'Rolagem vertical e horizontal com limites.',    Page: ScrollAreaDemo },
      { id: 'resizable',  name: 'Painéis redimensionáveis',description: 'Painéis divididos com alças arrastáveis.',    Page: ResizableDemo },
    ],
  },
  {
    name: 'Gráficos',
    entries: [
      { id: 'chart', name: 'Gráfico', description: 'Visualização de dados configurada, tooltip e legenda.', Page: ChartDemo },
    ],
  },
];

export const ALL_ENTRIES: PreviewEntry[] = [
  OVERVIEW_ENTRY,
  ...NAV_GROUPS.flatMap((group) => group.entries),
];

// A duplicate id would make one page unreachable (its deep link and highlight
// resolve to the first match), so fail loudly instead of shipping a dead page.
const duplicateIds = ALL_ENTRIES.map((entry) => entry.id).filter(
  (id, index, ids) => ids.indexOf(id) !== index,
);
if (duplicateIds.length > 0) {
  throw new Error(
    `Duplicate preview page id(s): ${[...new Set(duplicateIds)].join(
      ', ',
    )}. Every page id must be unique across all nav groups.`,
  );
}
