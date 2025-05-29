<?php
class block_tutor_statistics extends block_base {
    public function init() {
        $this->title = get_string('pluginname', 'block_tutor_statistics');
    }

    public function get_content() {
        global $USER, $COURSE;

        if ($this->content !== null) {
            return $this->content;
        }

        $this->content = new stdClass();
        $this->content->text = '';
        $this->content->footer = '';

        // Verificar si el usuario está autenticado y está en un curso
        if (isloggedin() && $COURSE->id != SITEID) {
            // Incluir Chart.js desde un CDN como un script global
            $this->page->requires->js(new moodle_url('https://cdn.jsdelivr.net/npm/chart.js@4.4.2/dist/chart.umd.js'), true);

            // Incluir el archivo de estilos
            $this->page->requires->css(new moodle_url('/blocks/tutor_statistics/styles.css'));

            // Contenedor para las estadísticas
            $this->content->text .= '
                <div id="statistics-container">
                    <h3>Estadísticas del Tutor Virtual</h3>
                    <div id="statistics-content">
                        <div class="chart-container">
                            <h4>Usuario Más Activo</h4>
                            <canvas id="top-user-chart"></canvas>
                        </div>
                        <div class="chart-container">
                            <h4>Hora de Mayor Uso</h4>
                            <canvas id="peak-hour-chart"></canvas>
                        </div>
                        <div class="chart-container">
                            <h4>Pregunta Más Frecuente</h4>
                            <canvas id="top-question-chart"></canvas>
                        </div>
                    </div>
                </div>
            ';

            // Cargar el JavaScript para obtener y mostrar las estadísticas
            $this->page->requires->js_call_amd('block_tutor_statistics/statistics', 'init', [
                'userid' => $USER->id
            ]);
        } else {
            $this->content->text = 'Por favor, inicia sesión y accede a un curso para ver las estadísticas.';
        }

        return $this->content;
    }

    public function applicable_formats() {
        return array('course-view' => true, 'site' => false, 'my' => false);
    }
}