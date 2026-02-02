type Widgets = {
    none: { widget: "none" };
    numberinput: { widget: "numberinput"; min?: number; max?: number; step?: number };
    slider: { widget: "slider"; min: number; max: number; step?: number };
    color: { widget: "color"; alpha?: boolean; nullable?: boolean };
};

export type Widget<K extends keyof Widgets> = Widgets[K];
